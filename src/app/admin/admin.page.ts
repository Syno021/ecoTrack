import { Component, OnInit, Injector, runInInjectionContext, NgZone } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';

interface PickupLocation {
  id: string;
  location: string;  // formerly 'name'
  address: string;
  wasteType: string;  // single waste type per schedule
  weekday: string;  // changed from date
  time: string;
  description: string;
  status: 'active' | 'cancelled';
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: false
})
export class AdminPage implements OnInit {
  selectedMainSection = 'requests-reports';
  selectedSegment = 'pending-requests';
  
  // Existing properties for requests and reports
  pendingRequests: any[] = [];
  completedRequests: any[] = [];
  pendingReports: any[] = [];
  resolvedReports: any[] = [];

  // New properties for pickup locations
  newLocation: PickupLocation = {
    id: '',
    location: '',
    address: '',
    wasteType: '',
    weekday: '',
    time: '',
    description: '',
    status: 'active'
  };
  pickupLocations: PickupLocation[] = [];
  wasteTypes = ['recyclable', 'organic', 'hazardous'];
  weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  constructor(
    private fireAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private ngZone: NgZone,
    private injector: Injector 
  ) {}

  async ngOnInit() {
    this.fireAuth.authState.subscribe(async user => {
      if (!user) {
        this.router.navigate(['/auth']);
        return;
      }
      
      const isAdmin = await this.checkAdminStatus(user.uid);
      if (!isAdmin) {
        this.router.navigate(['/home']);
        this.presentToast('Access denied. Admin rights required.', 'warning');
        return;
      }
      
      this.loadData();
    });
  }

  private async checkAdminStatus(userId: string): Promise<boolean> {
    try {
      const userDoc = await this.firestore.collection('users').doc(userId).get().toPromise();
      interface UserData {
        role?: string;
      }
      const userData = userDoc?.data() as UserData;
      return userData?.role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  loadData() {
    this.ngZone.run(() => {
      return runInInjectionContext(this.injector, () => {
        // Load pending requests
        this.firestore.collection('requests', ref => ref.where('status', '==', 'pending'))
          .valueChanges({ idField: 'id' })
          .subscribe(data => {
            this.pendingRequests = data;
          });

        // Load completed requests
        this.firestore.collection('requests', ref => ref.where('status', '==', 'completed'))
          .valueChanges({ idField: 'id' })
          .subscribe(data => {
            this.completedRequests = data;
          });

        // Load pending reports
        this.firestore.collection('reports', ref => ref.where('status', '==', 'pending'))
          .valueChanges({ idField: 'id' })
          .subscribe(data => {
            this.pendingReports = data;
          });

        // Load resolved reports
        this.firestore.collection('reports', ref => ref.where('status', '==', 'resolved'))
          .valueChanges({ idField: 'id' })
          .subscribe(data => {
            this.resolvedReports = data;
          });

        // Load pickup locations
        this.firestore.collection('schedules')
          .valueChanges({ idField: 'id' })
          .subscribe(data => {
            this.pickupLocations = data as PickupLocation[];
          });
      });
    });
  }

  async updateRequestStatus(requestId: string, newStatus: string) {
    try {
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          await this.firestore.collection('requests').doc(requestId).update({
            status: newStatus,
            updatedAt: new Date()
          });
        });
      });
      this.presentToast(`Request marked as ${newStatus}`, 'success');
    } catch (error) {
      this.presentToast('Error updating request', 'danger');
    }
  }

  async respondToReport(reportId: string) {
    const alert = await this.alertController.create({
      header: 'Respond to Report',
      inputs: [
        {
          name: 'response',
          type: 'textarea',
          placeholder: 'Enter your response...'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Submit',
          handler: async (data) => {
            try {
              await this.ngZone.run(() => {
                return runInInjectionContext(this.injector, async () => {
                  await this.firestore.collection('reports').doc(reportId).update({
                    status: 'resolved',
                    adminResponse: data.response,
                    resolvedAt: new Date()
                  });
                });
              });
              this.presentToast('Response submitted successfully', 'success');
            } catch (error) {
              this.presentToast('Error submitting response', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  // New methods for pickup locations
  async createPickupLocation() {
    try {
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          const docRef = await this.firestore.collection('schedules').add({
            ...this.newLocation,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          this.presentToast('Weekly collection schedule created successfully', 'success');
          
          // Reset form
          this.newLocation = {
            id: '',
            location: '',
            address: '',
            wasteType: '',
            weekday: '',
            time: '',
            description: '',
            status: 'active'
          };
        });
      });
    } catch (error) {
      this.presentToast('Error creating collection schedule', 'danger');
    }
  }

  async deleteLocation(id: string) {
    try {
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          await this.firestore.collection('schedules').doc(id).delete();
          this.presentToast('Collection schedule deleted successfully', 'success');
        });
      });
    } catch (error) {
      this.presentToast('Error deleting collection schedule', 'danger');
    }
  }

  // Method for viewing images
  async viewImage(photo: string) {
    // Implementation for image viewing modal
  }
}
