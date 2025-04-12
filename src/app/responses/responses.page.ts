import { Component, OnInit, Injector, runInInjectionContext, NgZone } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastController, ModalController, LoadingController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

interface Report {
  id: string;
  issueType: string;
  description: string;
  status: string;
  createdAt: Date;
  userId: string;
}

interface Request {
  id: string;
  wasteType: string;
  notes: string;
  status: string;
  updatedAt: Date;
  userId: string;
}

@Component({
  selector: 'app-responses',
  templateUrl: './responses.page.html',
  styleUrls: ['./responses.page.scss'],
  standalone: false
})
export class ResponsesPage implements OnInit {
  userReports: Report[] = [];
  userRequests: Request[] = [];
  isLoading = false;
  error: string | null = null;
  userEmail: string | null = null;
  selectedSegment = 'reports';

  constructor(
    private sanitizer: DomSanitizer,
    private toastController: ToastController,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private firestore: AngularFirestore,
    private ngZone: NgZone,
    private injector: Injector,
    private auth: AngularFireAuth,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.checkAuth();
  }

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }

  private async checkAuth() {
    try {
      const user = await this.auth.currentUser;
      if (!user) {
        this.router.navigate(['/auth']);
        const toast = await this.toastController.create({
          message: 'Please login to view your responses',
          duration: 3000,
          color: 'warning'
        });
        toast.present();
        return;
      }
      await this.loadUserFeedback();
    } catch (error) {
      console.error('Auth error:', error);
      this.router.navigate(['/login']);
    }
  }

  private async loadUserFeedback() {
    try {
      this.isLoading = true;
      const loading = await this.loadingController.create({
        message: 'Loading your feedback...'
      });
      await loading.present();

      const user = await this.auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const userId = user.uid;
      this.userEmail = user.email;
      console.log('Current user:', { userId, email: this.userEmail });

      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          console.log('Starting Firestore queries for user:', userId);
          const [reportsSnapshot, requestsSnapshot] = await Promise.all([
            this.firestore
              .collection('reports', ref => ref.where('userId', '==', userId))
              .get()
              .toPromise(),
            this.firestore
              .collection('requests', ref => ref.where('userId', '==', userId))
              .get()
              .toPromise()
          ]);

          console.log('Reports snapshot:', reportsSnapshot?.docs.length, 'documents found');
          console.log('Requests snapshot:', requestsSnapshot?.docs.length, 'documents found');

          this.userReports = reportsSnapshot?.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Record<string, any>)
          } as Report)) || [];

          this.userRequests = requestsSnapshot?.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Record<string, any>)
          } as Request)) || [];

          console.log('Processed Reports:', this.userReports);
          console.log('Processed Requests:', this.userRequests);
        });
      });

      await loading.dismiss();
      this.isLoading = false;
    } catch (error) {
      this.error = 'Failed to load feedback. Please try again.';
      console.error('Error loading feedback:', error);
      const toast = await this.toastController.create({
        message: this.error,
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    }
  }
}
