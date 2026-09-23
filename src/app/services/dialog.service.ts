import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

export interface ConfirmOptions {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: SweetAlertIcon;
  danger?: boolean;
}

// Centralized SweetAlert2 wrapper so every dialog in the app shares one look and feel.
@Injectable({
  providedIn: 'root'
})
export class DialogService {
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon ?? 'warning',
      showCancelButton: true,
      confirmButtonText: options.confirmText ?? 'Confirm',
      cancelButtonText: options.cancelText ?? 'Cancel',
      confirmButtonColor: options.danger ? '#a34e40' : '#355d49',
      cancelButtonColor: '#718077',
      reverseButtons: true,
      background: '#f8f7f1',
      color: '#253d33'
    });

    return result.isConfirmed;
  }

  async alert(
    title: string,
    text?: string,
    icon: SweetAlertIcon = 'info'
  ): Promise<void> {
    await Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: 'OK',
      confirmButtonColor: '#355d49',
      background: '#f8f7f1',
      color: '#253d33'
    });
  }
}
