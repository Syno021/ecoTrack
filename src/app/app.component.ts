// app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Platform, MenuController } from '@ionic/angular';
import { filter } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController} from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  public navItems = [
    {
      title: 'Home',
      url: '/home',
      icon: 'home'
    },
    {
      title: 'Manage Dump',
      url: '/manage-dump',
      icon: 'trash-bin'
    },
    {
      title: 'Schedule',
      url: '/schedule',
      icon: 'calendar'
    },
    {
      title: 'Image Recognition',
      url: '/image-recognition',
      icon: 'camera'
    },
    {
      title: 'Feedback',
      url: '/responses',
      icon: 'bookmark'
    },
  ];
  
  // Flag to check if the app is being viewed on web
  isWeb: boolean = false;
  
  // Flag to check if navbar should be hidden
  hideNavbar: boolean = true; // Default to true to prevent flash of nav on startup
  
  // Current URL to expose to template
  currentUrl: string = '';

  constructor(
    private platform: Platform,
    private router: Router,
    private menuCtrl: MenuController,
    private menuController: MenuController,
    private toastController: ToastController,
    private fireAuth: AngularFireAuth,
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    // Get initial route on component initialization
    this.currentUrl = this.router.url || '/';
    this.hideNavbar = this.shouldHideNavbar(this.currentUrl);
    
    // Setup route monitoring after initialization
    this.monitorRouteChanges();
    
    // Handle the sidebar state properly on initial load
    if (this.isOnRestrictedPage(this.currentUrl)) {
      this.menuCtrl.enable(false, 'sidebar');
    } else {
      this.menuCtrl.enable(true, 'sidebar');
      // Only auto-open on web for non-restricted pages
      if (this.isWeb && window.innerWidth > 768) {
        this.menuCtrl.open('sidebar');
      }
    }
  }

  initializeApp() {
    // Check if the app is running on a web platform
    this.isWeb = this.platform.is('desktop') || this.platform.is('mobileweb');
  }
  
  monitorRouteChanges() {
    // Subscribe to router events to detect when we're on pages that should hide navbar
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const url = event.url;
      this.currentUrl = url; // Update the public current URL
      
      // Check if the current URL is one where navbar should be hidden
      this.hideNavbar = this.shouldHideNavbar(url);
      
      // Close sidebar when on restricted pages
      if (this.isOnRestrictedPage(url)) {
        this.menuCtrl.close('sidebar');
        this.menuCtrl.enable(false, 'sidebar');
      } else {
        this.menuCtrl.enable(true, 'sidebar');
      }
    });
  }
  
  shouldHideNavbar(url: string): boolean {
    // List of paths where navbar should be hidden
    const restrictedPaths = [
      '/',
      '/auth',
      '/admin',
      '/forgot-password',
      '/home' // Keep /home in restricted paths
    ];
    
    // Check if URL starts with any of these prefixes
    return restrictedPaths.some(path => 
      url === path || 
      url === path + '/' || // Handle trailing slash
      (path !== '/' && url.startsWith(path + '/'))
    );
  }

  isOnRestrictedPage(url: string): boolean {
    // Use the same logic for restricted pages
    return this.shouldHideNavbar(url);
  }

  // Helper method to determine if menu button should be shown
  showMenuButton(): boolean {
    // Show menu button only when not on restricted pages
    return !this.isOnRestrictedPage(this.currentUrl);
  }

  navigateTo(url: string) {
    this.router.navigateByUrl(url);
    this.menuCtrl.close('sidebar');
    
    // Close the menu on navigation for mobile or when going to restricted pages
    if (!this.isWeb || this.isOnRestrictedPage(url)) {
      this.menuCtrl.close('sidebar');
    }
  }

  async toggleMenu() {
    await this.menuController.toggle('sidebar');
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  async logout() {
    try {
      await this.fireAuth.signOut();
      this.router.navigate(['/']);
    } catch (error) {
      this.presentToast('Unable to log out. Please try again.','danger');
    }
  }
}