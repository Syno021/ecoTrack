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
    }
  ];
  
  // Flag to check if the app is being viewed on web
  isWeb: boolean = false;
  
  // Flag to check if navbar should be hidden
  hideNavbar: boolean = false;

  constructor(
    private platform: Platform,
    private router: Router,
    private menuCtrl: MenuController
  ) {
    this.initializeApp();
    this.monitorRouteChanges();
  }

  initializeApp() {
    // Check if the app is running on a web platform
    this.isWeb = this.platform.is('desktop') || this.platform.is('mobileweb');
    
    // If it's web view, we can enable the sidebar by default (unless on restricted pages)
    if (this.isWeb) {
      // Optional: open the menu programmatically on initial load for larger screens
      this.platform.ready().then(() => {
        if (window.innerWidth > 768 && !this.hideNavbar) {
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
      
      // Check if the current URL is one where navbar should be hidden
      this.hideNavbar = this.shouldHideNavbar(url);
      
      // Close sidebar when on restricted pages
      if (this.hideNavbar) {
        this.menuCtrl.close('sidebar');
      }
    });
  }
  
  shouldHideNavbar(url: string): boolean {
    // List of paths where navbar should be hidden
    const restrictedPaths = [
      '/',
      '/home',
      '/auth',
      '/admin',
    ];
    
    // Check if URL starts with any of these prefixes
    return restrictedPaths.some(path => 
      url === path || 
      (path !== '/' && url.startsWith(path + '/'))
    );
  }

  navigateTo(url: string) {
    this.router.navigateByUrl(url);
    
    // Close the menu on navigation for mobile web or when going to restricted pages
    if ((this.isWeb && window.innerWidth <= 768) || this.shouldHideNavbar(url)) {
      this.menuCtrl.close('sidebar');
    }
  }
}