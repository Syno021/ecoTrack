import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastController, ModalController, LoadingController, RefresherEventDetail } from '@ionic/angular';

interface Schedule {
  id: number;
  location: string;
  date: Date;
  time: string;
  wasteType: string;
  description: string;
  expanded?: boolean;
}

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.page.html',
  styleUrls: ['./schedule.page.scss'],
  standalone: false,
})
export class SchedulePage implements OnInit {
  schedules: Schedule[] = [
    {
      id: 1,
      location: 'KwaMashu Zone 5',
      date: new Date('2025-04-10'),
      time: '08:00 AM',
      wasteType: 'Recyclable Waste',
      description: 'Collecting plastics, paper, glass, and cans.'
    },
    {
      id: 2,
      location: 'Umlazi V Section',
      date: new Date('2025-04-12'),
      time: '10:00 AM',
      wasteType: 'Organic Waste',
      description: 'Collecting food waste and yard trimmings.'
    },
    {
      id: 3,
      location: 'Durban CBD',
      date: new Date('2025-04-15'),
      time: '12:00 PM',
      wasteType: 'Hazardous Waste',
      description: 'Special collection for expired batteries and chemicals.'
    },
    {
      id: 4,
      location: 'Phoenix',
      date: new Date('2025-04-18'),
      time: '09:00 AM',
      wasteType: 'Recyclable Waste',
      description: 'Collection of paper, cardboard, and plastic containers.'
    },
    {
      id: 5,
      location: 'Chatsworth',
      date: new Date('2025-04-20'),
      time: '11:00 AM',
      wasteType: 'Organic Waste',
      description: 'Garden waste and compostable materials collection.'
    }
  ];
  
  filteredSchedules: Schedule[] = [];
  upcomingSchedule: Schedule | null = null;
  selectedSchedule: Schedule | null = null;
  filter: string = 'all';

  constructor(
    private sanitizer: DomSanitizer,
    private toastController: ToastController,
    private modalController: ModalController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.sortSchedules();
    this.filterSchedules();
    this.findUpcomingSchedule();
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
    // Simulate refresh
    setTimeout(() => {
      this.sortSchedules();
      this.filterSchedules();
      this.findUpcomingSchedule();
      
      if (event) {
        event.target.complete();
      }
      
      this.presentToast('Schedule updated');
    }, 1000);
  }

  openNotificationSettings() {
    this.presentToast('Notification settings will be available soon');
  }
}
