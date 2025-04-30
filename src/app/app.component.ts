// app.component.ts
import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Platform, MenuController } from '@ionic/angular';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent {
  public navItems = [
    {
      title: 'home',
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
  hideNavbar: boolean = false;
  
  // Current URL to expose to template
  currentUrl: string = '';

  constructor(
    private platform: Platform,
    private router: Router,
    private menuCtrl: MenuController,
    private menuController: MenuController
  ) {
    this.initializeApp();
    this.monitorRouteChanges();
    // Initialize current URL
    this.currentUrl = this.router.url;
  }

  initializeApp() {
    // Check if the app is running on a web platform
    this.isWeb = this.platform.is('desktop') || this.platform.is('mobileweb');
    
    // If it's web view, we can enable the sidebar by default (unless on restricted pages)
    if (this.isWeb) {
      // Optional: open the menu programmatically on initial load for larger screens
      this.platform.ready().then(() => {
        if (window.innerWidth > 768 && !this.isOnRestrictedPage(this.currentUrl)) {
          this.menuCtrl.open('sidebar');
        }
      });
    }
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
      '/home' // Added /home to hide navbar on home page
    ];
    
    // Check if URL starts with any of these prefixes
    return restrictedPaths.some(path => 
      url === path || 
      (path !== '/' && url.startsWith(path + '/'))
    );
  }

  isOnRestrictedPage(url: string): boolean {
    // List of paths where sidebar should be disabled
    const restrictedPaths = [
      '/auth',
      '/admin',
      '/forgot-password',
      '/home' // Ensure /home is consistently handled as a restricted page
    ];
    
    // Check if URL starts with any of these prefixes
    return restrictedPaths.some(path => 
      url === path || 
      (path !== '/' && url.startsWith(path + '/'))
    );
  }

  // Helper method to determine if menu button should be shown
  showMenuButton(): boolean {
    // Show menu button only on mobile view and when not on restricted pages
    return !this.isWeb && !this.isOnRestrictedPage(this.currentUrl);
  }

  navigateTo(url: string) {
    this.router.navigateByUrl(url);
    
    // Close the menu on navigation for mobile or when going to restricted pages
    if (!this.isWeb || this.isOnRestrictedPage(url)) {
      this.menuCtrl.close('sidebar');
    }
  }

  async toggleMenu() {
    await this.menuController.toggle('sidebar');
  }
}