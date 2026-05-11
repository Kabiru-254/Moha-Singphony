import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Message, MessageType } from './message.service';

export type NotificationType = 'cue' | 'request' | 'resolved' | 'urgent' | 'info';

export interface Notification {
  id: string;
  message: Message;
  type: NotificationType;
  title: string;
  content: string;
  timestamp: Date;
  duration: number; // in milliseconds
  isRead: boolean;
  isUrgent: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private newNotificationSubject = new Subject<Notification>();

  public notifications$ = this.notificationsSubject.asObservable();
  public newNotification$ = this.newNotificationSubject.asObservable();

  private notifications: Notification[] = [];

  constructor() { }

  // Create a notification from a message
  createNotificationFromMessage(message: Message): void {
    const notification = this.mapMessageToNotification(message);
    this.addNotification(notification);
  }

  // Add a custom notification
  addNotification(notification: Notification): void {
    this.notifications.push(notification);
    this.notificationsSubject.next([...this.notifications]);
    this.newNotificationSubject.next(notification);

    // Auto-dismiss non-urgent notifications
    if (!notification.isUrgent && notification.duration > 0) {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, notification.duration);
    }
  }

  // Show a simple notification with a message and type
  showNotification(message: string, type: NotificationType = 'info'): void {
    const notification: Notification = {
      id: this.generateId(),
      message: null as any, // No associated message
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      content: message,
      timestamp: new Date(),
      duration: 5000, // Default 5 seconds
      isRead: false,
      isUrgent: type === 'urgent'
    };

    this.addNotification(notification);
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Dismiss a notification
  dismissNotification(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications[index].isRead = true;
      this.notificationsSubject.next([...this.notifications]);
    }
  }

  // Clear all notifications
  clearAllNotifications(): void {
    this.notifications = [];
    this.notificationsSubject.next([]);
  }

  // Get unread notifications
  getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.isRead);
  }

  // Map a message to a notification
  private mapMessageToNotification(message: Message): Notification {
    let type: NotificationType = 'info';
    let title = 'New Message';
    let content = '';
    let isUrgent = false;
    let duration = 5000; // Default 5 seconds

    switch (message.type) {
      case MessageType.KEY_CHANGE:
        type = 'cue';
        title = 'Key Change';
        content = `Key changed to ${message.content.key}`;
        break;
      case MessageType.TEMPO_CHANGE:
        type = 'cue';
        title = 'Tempo Change';
        content = message.content && message.content.direction === 'increase' ? 'Increase Tempo' : 'Reduce Tempo';
        break;
      case MessageType.MUSICAL_INSTRUCTION:
        type = 'cue';
        title = 'Musical Instruction';
        content = message.content.instruction;
        break;
      case MessageType.SOUND_REQUEST:
        type = 'request';
        title = 'Sound Request';
        content = message.content.request;
        duration = 0; // Persist until manually dismissed
        break;
      case MessageType.ACKNOWLEDGMENT:
        type = 'resolved';
        title = 'Request Resolved';
        content = message.content.text || 'Issue has been resolved';
        break;
      case MessageType.GENERAL_COMMUNICATION:
        type = 'info';
        title = 'Message';
        content = message.content.text;
        break;
      case MessageType.SERVICE_COORDINATION:
        type = 'urgent';
        title = 'Service Coordination';
        content = message.content.instruction;
        isUrgent = true;
        duration = 0; // Persist until manually dismissed
        break;
      case MessageType.CUSTOM_MESSAGE:
        type = message.content.isUrgent ? 'urgent' : 'info';
        title = message.content.title || 'Custom Message';
        content = message.content.text;
        isUrgent = message.content.isUrgent || false;
        if (isUrgent) {
          duration = 0; // Urgent messages persist
        }
        break;
      default:
        content = JSON.stringify(message.content);
    }

    return {
      id: message.id,
      message,
      type,
      title,
      content,
      timestamp: message.timestamp,
      duration,
      isRead: false,
      isUrgent
    };
  }
}
