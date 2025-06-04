import { Component, OnInit, Injector, runInInjectionContext, NgZone } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastController, ModalController, LoadingController } from '@ionic/angular';
import { AngularFirestore, QueryDocumentSnapshot } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';

interface UserFavorite {
  userId: string;
  scheduleId: string;
}

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
  isFavorite?: boolean;
  userFavorites?: string[]; // Array of user IDs who favorited this schedule
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
  searchText: string = '';
  currentUserId: string | null = null; // Change to public by removing private keyword

  // ...or alternatively, keep it private and add a public getter:
  // private currentUserId: string | null = null;
  // get isLoggedIn(): boolean {
  //   return this.currentUserId !== null;
  // }

  get isLoggedIn(): boolean {
    return this.currentUserId !== null;
  }

  constructor(
    private sanitizer: DomSanitizer,
    private toastController: ToastController,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private firestore: AngularFirestore,
    private ngZone: NgZone,
    private injector: Injector,
    private auth: AngularFireAuth
  ) {
    this.auth.user.subscribe(user => {
      this.currentUserId = user ? user.uid : null;
      if (this.schedules.length > 0) {
        this.updateFavoriteStatus();
      }
    });
  }

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
          .subscribe(async (data: any[]) => {
            this.schedules = data.map(item => ({
              ...item,
              date: item.date?.seconds ? new Date(item.date.seconds * 1000) : new Date(),
              isFavorite: false
            }));

            if (this.currentUserId) {
              await this.updateFavoriteStatus();
            }

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

  async updateFavoriteStatus() {
    if (!this.currentUserId) return;

    try {
      await runInInjectionContext(this.injector, async () => {
        const userFavorites = await this.firestore
          .collection('userFavorites', ref => 
            ref.where('userId', '==', this.currentUserId)
          )
          .get()
          .toPromise();

        const favoriteIds = new Set(userFavorites?.docs.map((doc: QueryDocumentSnapshot<any>) => doc.data()['scheduleId']));
        this.schedules.forEach(schedule => {
          schedule.isFavorite = favoriteIds.has(schedule.id);
        });
      });
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  }

  sortSchedules() {
    this.schedules.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.date.getTime() - b.date.getTime();
    });
  }

  filterSchedules() {
    if (!this.searchText.trim()) {
      this.filteredSchedules = [...this.schedules];
      return;
    }
    
    const searchTerm = this.searchText.toLowerCase().trim();
    this.filteredSchedules = this.schedules.filter(schedule => 
      schedule.location.toLowerCase().includes(searchTerm) ||
      schedule.wasteType.toLowerCase().includes(searchTerm)
    );
  }

  findUpcomingSchedule() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    this.upcomingSchedule = this.schedules
      .filter(s => {
        const scheduleDate = new Date(s.date);
        scheduleDate.setHours(0, 0, 0, 0);
        return scheduleDate >= now && s.isFavorite;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] || null;

    // Force change detection
    this.ngZone.run(() => {});
  }

  expandSchedule(schedule: Schedule) {
    if (this.selectedSchedule && this.selectedSchedule.id === schedule.id) {
      this.selectedSchedule = null;
      schedule.expanded = false;
    } else {
      this.schedules.forEach(s => s.expanded = false);
      this.selectedSchedule = schedule;
      schedule.expanded = true;
    }
  }

  getDaysRemaining(dateStr: Date): string {
    const today = new Date();
    const collectionDate = new Date(dateStr);
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

  async toggleFavorite(schedule: Schedule) {
    if (!this.currentUserId) {
      this.presentToast('Please log in to add favorites');
      return;
    }

    try {
      await runInInjectionContext(this.injector, async () => {
        const favoriteQuery = await this.firestore
          .collection('userFavorites', ref => 
            ref.where('userId', '==', this.currentUserId)
              .where('scheduleId', '==', schedule.id)
          )
          .get()
          .toPromise();

        if (!schedule.isFavorite) {
          await runInInjectionContext(this.injector, async () => {
            await this.firestore.collection('userFavorites').add({
              userId: this.currentUserId,
              scheduleId: schedule.id,
              addedAt: new Date()
            });
          });
        } else {
          await runInInjectionContext(this.injector, async () => {
            const docToDelete = favoriteQuery?.docs[0];
            if (docToDelete) {
              await docToDelete.ref.delete();
            }
          });
        }

        schedule.isFavorite = !schedule.isFavorite;
        
        // Update the schedules array with the modified schedule
        const index = this.schedules.findIndex(s => s.id === schedule.id);
        if (index !== -1) {
          this.schedules[index] = { ...schedule };
        }

        this.sortSchedules();
        this.findUpcomingSchedule();
        this.filterSchedules();
        
        this.presentToast(schedule.isFavorite ? 
          `${schedule.location} added to favorites` : 
          `${schedule.location} removed from favorites`
        );
      });
    } catch (error) {
      console.error('Error updating favorite status:', error);
      this.presentToast('Error updating favorite status');
    }
  }
}
