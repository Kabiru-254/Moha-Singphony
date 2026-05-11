import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { NotificationService, Notification } from '../../services/notification.service';
import { trigger, transition, style, animate } from '@angular/animations';

interface NotificationProgress {
  [id: string]: {
    startTime: number;
    duration: number;
    isPaused: boolean;
    pausedAt?: number;
    pausedProgress?: number;
  };
}

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('240ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(110%)', opacity: 0 }))
      ])
    ])
  ]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();
  private progressTracking: NotificationProgress = {};
  private progressInterval: any;

  constructor(private notificationService: NotificationService) { }

  ngOnInit(): void {
    // Subscribe to all notifications
    this.subscription.add(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications.filter(n => !n.isRead);
        
        // Initialize progress tracking for auto-dismiss notifications
        notifications.forEach(notification => {
          if (this.shouldAutoDismiss(notification) && !this.progressTracking[notification.id]) {
            this.progressTracking[notification.id] = {
              startTime: Date.now(),
              duration: 5000, // 5 seconds
              isPaused: false
            };
          }
        });
      })
    );

    // Progress update interval
    this.progressInterval = setInterval(() => {
      this.updateProgress();
    }, 50);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }

  private updateProgress(): void {
    const now = Date.now();
    Object.keys(this.progressTracking).forEach(id => {
      const progress = this.progressTracking[id];
      if (!progress.isPaused) {
        const elapsed = now - progress.startTime;
        if (elapsed >= progress.duration) {
          // Auto-dismiss
          const notification = this.notifications.find(n => n.id === id);
          if (notification) {
            this.dismiss(notification);
          }
          delete this.progressTracking[id];
        }
      }
    });
  }

  dismiss(notification: Notification): void {
    delete this.progressTracking[notification.id];
    this.notificationService.dismissNotification(notification.id);
  }

  // Check if any notification is urgent
  hasUrgentNotification(): boolean {
    return this.notifications.some(n => n.isUrgent);
  }

  // TrackBy function for performance
  trackByNotificationId(index: number, notification: Notification): string {
    return notification.id;
  }

  // Handle hover to pause auto-dismiss
  onNotificationHover(notification: Notification, isHovering: boolean): void {
    const progress = this.progressTracking[notification.id];
    if (progress) {
      if (isHovering) {
        progress.isPaused = true;
        progress.pausedAt = Date.now();
        progress.pausedProgress = this.getProgressWidth(notification);
      } else {
        if (progress.pausedAt) {
          const pauseDuration = Date.now() - progress.pausedAt;
          progress.startTime += pauseDuration;
        }
        progress.isPaused = false;
      }
    }
  }

  // Get notification container classes
  getNotificationClasses(notification: Notification): string {
    const classes = ['bg-[#161D2E]'];
    
    if (notification.isUrgent) {
      classes.push('urgent-notification');
    }
    
    return classes.join(' ');
  }

  // Get left border class based on type
  getLeftBorderClass(notification: Notification): string {
    const baseClass = notification.isUrgent ? 'pulse-border' : '';
    const colorClass = this.getTypeColorClass(notification.type);
    return `${baseClass} ${colorClass}`.trim();
  }

  // Get icon container background class
  getIconContainerClass(type: string): string {
    switch (type) {
      case 'cue':
        return 'bg-indigo-500/15';
      case 'request':
        return 'bg-amber-500/15';
      case 'resolved':
        return 'bg-emerald-500/15';
      case 'urgent':
        return 'bg-red-500/15';
      case 'info':
      default:
        return 'bg-[#8A93A8]/15';
    }
  }

  // Get icon color class
  getIconColorClass(type: string): string {
    switch (type) {
      case 'cue':
        return 'text-indigo-500';
      case 'request':
        return 'text-amber-500';
      case 'resolved':
        return 'text-emerald-500';
      case 'urgent':
        return 'text-red-500';
      case 'info':
      default:
        return 'text-[#8A93A8]';
    }
  }

  // Get type color for borders
  private getTypeColorClass(type: string): string {
    switch (type) {
      case 'cue':
        return 'bg-indigo-500';
      case 'request':
        return 'bg-amber-500';
      case 'resolved':
        return 'bg-emerald-500';
      case 'urgent':
        return 'bg-red-500';
      case 'info':
      default:
        return 'bg-[#8A93A8]';
    }
  }

  // Get appropriate icon based on notification type
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'cue':
        return 'music_note';
      case 'request':
        return 'support_agent';
      case 'resolved':
        return 'check_circle';
      case 'urgent':
        return 'priority_high';
      case 'info':
      default:
        return 'info';
    }
  }

  // Check if notification should auto-dismiss
  private shouldAutoDismiss(notification: Notification): boolean {
    return notification.type === 'cue' || notification.type === 'resolved';
  }

  // Check if progress bar should be shown
  shouldShowProgress(notification: Notification): boolean {
    return this.shouldAutoDismiss(notification) && !!this.progressTracking[notification.id];
  }

  // Get progress bar color class
  getProgressBarClass(type: string): string {
    return this.getTypeColorClass(type);
  }

  // Calculate progress width percentage
  getProgressWidth(notification: Notification): number {
    const progress = this.progressTracking[notification.id];
    if (!progress) return 0;
    
    if (progress.isPaused && progress.pausedProgress !== undefined) {
      return progress.pausedProgress;
    }
    
    const elapsed = Date.now() - progress.startTime;
    const percentage = 100 - (elapsed / progress.duration) * 100;
    return Math.max(0, Math.min(100, percentage));
  }
}
