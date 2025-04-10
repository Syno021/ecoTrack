import { Component, OnInit, Injector, runInInjectionContext, NgZone } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastController, ModalController, LoadingController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';

interface Schedule {
  id: string;
  location: string;
  address: string;
  date: any; // Firestore timestamp
  time: string;
  wasteType: string;
  description: string;
  status: 'active' | 'cancelled';
  expanded?: boolean;
}

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.page.html',
  styleUrls: ['./schedule.page.scss'],
  standalone: false,
})
export class SchedulePage implements OnInit {
  schedules: Schedule[] = [];
  filteredSchedules: Schedule[] = [];
  upcomingSchedule: Schedule | null = null;
  selectedSchedule: Schedule | null = null;
  filter: string = 'all';

  constructor(
    private sanitizer: DomSanitizer,
    private toastController: ToastController,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private firestore: AngularFirestore,
    private ngZone: NgZone,
    private injector: Injector 
  ) {}

  ngOnInit() {
    this.loadSchedules();
  }

  async loadSchedules() {
    const loading = await this.loadingController.create({
      message: 'Loading schedules...'
    });
    await loading.present();

    try {
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          this.firestore.collection('schedules', ref => 
            ref.where('status', '==', 'active')
          ).valueChanges({ idField: 'id' })
          .subscribe((data: any[]) => {
            this.schedules = data.map(item => ({
              ...item,
              date: item.date?.seconds ? new Date(item.date.seconds * 1000) : new Date()
            }));
            this.sortSchedules();
            this.filterSchedules();
            this.findUpcomingSchedule();
            loading.dismiss();
          }, error => {
            console.error('Error loading schedules:', error);
            this.presentToast('Error loading schedules');
            loading.dismiss();
          });
        });
      });
    } catch (error) {
      console.error('Error in loadSchedules:', error);
      this.presentToast('Error loading schedules');
      loading.dismiss();
    }
  }

  sortSchedules() {
    this.schedules.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  filterSchedules() {
    if (this.filter === 'all') {
      this.filteredSchedules = [...this.schedules];
    } else {
      const filterTerm = this.filter.toLowerCase();
      this.filteredSchedules = this.schedules.filter(schedule => 
        schedule.wasteType.toLowerCase().includes(filterTerm)
      );
    }
  }

  findUpcomingSchedule() {
    const now = new Date();
    this.upcomingSchedule = this.schedules
      .filter(s => s.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] || null;
  }

  expandSchedule(schedule: Schedule) {
    if (this.selectedSchedule && this.selectedSchedule.id === schedule.id) {
      this.selectedSchedule = null;
      schedule.expanded = false;
    } else {
      // Reset all expanded states
      this.schedules.forEach(s => s.expanded = false);
      
      // Set the selected schedule
      this.selectedSchedule = schedule;
      schedule.expanded = true;
    }
  }

  getDaysRemaining(dateStr: Date): string {
    const today = new Date();
    const collectionDate = new Date(dateStr);
    
    // Set both dates to midnight for accurate day calculation
    today.setHours(0, 0, 0, 0);
    collectionDate.setHours(0, 0, 0, 0);
    
    const diffTime = collectionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `${diffDays} days`;
    }
  }

  getIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'recyclable waste':
        return 'recycle-outline';
      case 'organic waste':
        return 'leaf-outline';
      case 'hazardous waste':
        return 'warning-outline';
      default:
        return 'trash-outline';
    }
  }

  getWasteColor(type: string): string {
    switch (type.toLowerCase()) {
      case 'recyclable waste':
        return 'primary';
      case 'organic waste':
        return 'success';
      case 'hazardous waste':
        return 'danger';
      default:
        return 'medium';
    }
  }

  viewOnMap(schedule: Schedule) {
    const query = encodeURIComponent(schedule.location + ', Durban, South Africa');
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(mapUrl, '_blank');
    
    this.presentToast(`Opening map for ${schedule.location}`);
  }

  getMapEmbedUrl(location: string): SafeResourceUrl {
    const url = `https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  async addToCalendar(schedule: Schedule) {
    const loading = await this.loadingController.create({
      message: 'Adding to calendar...',
      duration: 800
    });
    await loading.present();
    
    // Simulating calendar integration
    setTimeout(() => {
      this.presentToast(`${schedule.wasteType} collection at ${schedule.location} added to your calendar`);
    }, 1000);
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: 'dark'
    });
    toast.present();
  }

  async refreshSchedules(event?: any) {
    try {
      await this.loadSchedules();
      if (event) {
        event.target.complete();
      }
      this.presentToast('Schedule updated');
    } catch (error) {
      this.presentToast('Error refreshing schedules');
      if (event) {
        event.target.complete();
      }
    }
  }

  openNotificationSettings() {
    this.presentToast('Notification settings will be available soon');
  }
}
