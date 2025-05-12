import { Component, OnInit, Injector, runInInjectionContext, NgZone, AfterViewInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ToastController, LoadingController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Geolocation } from '@capacitor/geolocation';
import * as L from 'leaflet';

declare var require: any;

@Component({
  selector: 'app-manage-dump',
  templateUrl: './manage-dump.page.html',
  styleUrls: ['./manage-dump.page.scss'],
  standalone: false,
})
export class ManageDumpPage implements OnInit, AfterViewInit {
  // Default segment selection
  selectedSegment: string = 'request';

  // Map variables
  requestMap: L.Map | null = null;
  reportMap: L.Map | null = null;
  requestMarker: L.Marker | null = null;
  reportMarker: L.Marker | null = null;
  showRequestAddressMap: boolean = false;
  showReportAddressMap: boolean = false;

  // Pickup request form data
  pickupRequest = {
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    date: new Date().toISOString(),
    wasteType: '',
    otherWasteType: '',
    notes: '',
    coordinates: {
      lat: 0,
      lng: 0
    }
  };

  // Issue reporting form data
  issueReport = {
    name: '',
    email: '',
    phone: '',
    issueType: '',
    location: '',
    city: '',
    state: '',
    postalCode: '',
    date: new Date().toISOString(),
    description: '',
    priority: 'medium',
    photos: [] as string[],
    coordinates: {
      lat: 0,
      lng: 0
    }
  };

  // Add user data properties
  currentUser: any = null;
  userEmail: string = '';

  constructor(
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
    private fireAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private ngZone: NgZone,
    private injector: Injector,
    private platform: Platform
  ) { }

  async ngOnInit() {
    // Check authentication status
    this.fireAuth.authState.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.userEmail = user.email || '';
      } else {
        this.router.navigate(['/home']);
      }
    });
  }

  ngAfterViewInit() {
    // Maps will be initialized when toggled
  }

  // Toggle address map sections
  toggleAddressMap(type: 'request' | 'report') {
    if (type === 'request') {
      this.showRequestAddressMap = !this.showRequestAddressMap;
      if (this.showRequestAddressMap) {
        setTimeout(() => this.initMap('request'), 300);
      }
    } else {
      this.showReportAddressMap = !this.showReportAddressMap;
      if (this.showReportAddressMap) {
        setTimeout(() => this.initMap('report'), 300);
      }
    }
  }

  // Initialize maps
  initMap(type: 'request' | 'report') {
    const mapId = type === 'request' ? 'requestAddressMap' : 'reportAddressMap';
    const mapElement = document.getElementById(mapId);
    
    if (!mapElement) {
      this.presentToast(`Cannot initialize map: Element "${mapId}" not found`, 'danger');
      return;
    }

    // Define map options
    const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const osmAttrib = '© OpenStreetMap contributors';
    const osm = L.tileLayer(osmUrl, { maxZoom: 18, attribution: osmAttrib });
    
    // Default coordinates (can be adjusted)
    const defaultPosition = L.latLng(0, 0);
    
    // Create map instance
    if (type === 'request') {
      if (this.requestMap) {
        this.requestMap.remove();
      }
      this.requestMap = L.map(mapId).setView(defaultPosition, 2);
      L.tileLayer(osmUrl, { maxZoom: 18, attribution: osmAttrib }).addTo(this.requestMap);
    } else {
      if (this.reportMap) {
        this.reportMap.remove();
      }
      this.reportMap = L.map(mapId).setView(defaultPosition, 2);
      L.tileLayer(osmUrl, { maxZoom: 18, attribution: osmAttrib }).addTo(this.reportMap);
    }

    // Try to get current location automatically
    this.getCurrentLocation(type);
  }

  // Get current location
  async getCurrentLocation(type: 'request' | 'report') {
    const loading = await this.loadingController.create({
      message: 'Getting your location...'
    });
    await loading.present();

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true
      });
      
      const { latitude, longitude } = position.coords;
      
      // Update map and place marker
      if (type === 'request' && this.requestMap) {
        this.requestMap.setView([latitude, longitude], 15);
        
        if (this.requestMarker) {
          this.requestMarker.setLatLng([latitude, longitude]);
        } else {
          this.requestMarker = L.marker([latitude, longitude], {
            draggable: true
          }).addTo(this.requestMap);
          
          // Add event listener for marker dragging
          this.requestMarker.on('dragend', () => {
            if (this.requestMarker) {
              const pos = this.requestMarker.getLatLng();
              this.reverseGeocode(pos.lat, pos.lng, 'request');
            }
          });
        }
        
        // Store coordinates
        this.pickupRequest.coordinates = {
          lat: latitude,
          lng: longitude
        };
        
        // Get address from coordinates
        this.reverseGeocode(latitude, longitude, 'request');
      } else if (type === 'report' && this.reportMap) {
        this.reportMap.setView([latitude, longitude], 15);
        
        if (this.reportMarker) {
          this.reportMarker.setLatLng([latitude, longitude]);
        } else {
          this.reportMarker = L.marker([latitude, longitude], {
            draggable: true
          }).addTo(this.reportMap);
          
          // Add event listener for marker dragging
          this.reportMarker.on('dragend', () => {
            if (this.reportMarker) {
              const pos = this.reportMarker.getLatLng();
              this.reverseGeocode(pos.lat, pos.lng, 'report');
            }
          });
        }
        
        // Store coordinates
        this.issueReport.coordinates = {
          lat: latitude,
          lng: longitude
        };
        
        // Get address from coordinates
        this.reverseGeocode(latitude, longitude, 'report');
      }
      
      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();
      console.error('Error getting location', error);
      this.presentToast('Could not access your location. Please ensure location permissions are enabled.', 'warning');
    }
  }

  // Reverse geocode (convert coordinates to address)
  async reverseGeocode(lat: number, lng: number, type: 'request' | 'report') {
    const loading = await this.loadingController.create({
      message: 'Getting address...'
    });
    await loading.present();

    try {
      // Using Nominatim API for reverse geocoding
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        
        // Format address components
        const street = address.road || '';
        const houseNumber = address.house_number || '';
        const streetAddress = houseNumber ? `${houseNumber} ${street}` : street;
        const city = address.city || address.town || address.village || address.hamlet || '';
        const state = address.state || address.county || '';
        const postalCode = address.postcode || '';
        
        // Update form based on type
        if (type === 'request') {
          this.pickupRequest.address = streetAddress;
          this.pickupRequest.city = city;
          this.pickupRequest.state = state;
          this.pickupRequest.postalCode = postalCode;
        } else {
          this.issueReport.location = streetAddress;
          this.issueReport.city = city;
          this.issueReport.state = state;
          this.issueReport.postalCode = postalCode;
        }
      }
      
      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();
      console.error('Error during reverse geocoding', error);
      this.presentToast('Could not get address from location. Please enter manually.', 'warning');
    }
  }

  async submitPickupRequest() {
    if (!this.currentUser) {
      this.router.navigate(['/home']);
      return;
    }

    // Validate form inputs
    if (!this.pickupRequest.name || !this.pickupRequest.phone || !this.pickupRequest.address || 
        !this.pickupRequest.city || !this.pickupRequest.state || !this.pickupRequest.wasteType) {
      this.presentToast('Please fill in all required fields', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Submitting request...'
    });
    await loading.present();

    try {
      // Format the complete address
      const formattedAddress = `${this.pickupRequest.address}, ${this.pickupRequest.city}, ${this.pickupRequest.state} ${this.pickupRequest.postalCode}`;
      
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          await this.firestore.collection('requests').add({
            name: this.pickupRequest.name,
            phone: this.pickupRequest.phone,
            address: formattedAddress, // Store formatted address
            addressDetails: {
              street: this.pickupRequest.address,
              city: this.pickupRequest.city,
              state: this.pickupRequest.state,
              postalCode: this.pickupRequest.postalCode,
              coordinates: this.pickupRequest.coordinates
            },
            date: this.pickupRequest.date,
            wasteType: this.pickupRequest.wasteType,
            otherWasteType: this.pickupRequest.otherWasteType,
            notes: this.pickupRequest.notes,
            userId: this.currentUser.uid,
            userEmail: this.userEmail,
            createdAt: new Date(),
            status: 'pending'
          });
        });
      });

      await loading.dismiss();
      this.presentToast('Pickup request submitted successfully!', 'success');
      
      // Reset form
      this.pickupRequest = {
        name: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        date: new Date().toISOString(),
        wasteType: '',
        otherWasteType: '',
        notes: '',
        coordinates: {
          lat: 0,
          lng: 0
        }
      };
    } catch (error) {
      await loading.dismiss();
      this.presentToast('Error submitting request. Please try again.', 'danger');
      console.error('Error:', error);
    }
  }

  async submitIssueReport() {
    if (!this.currentUser) {
      this.router.navigate(['/home']);
      return;
    }

    // Validate form inputs
    if (!this.issueReport.name || !this.issueReport.email || !this.issueReport.issueType || 
        !this.issueReport.location || !this.issueReport.city || !this.issueReport.description) {
      this.presentToast('Please fill in all required fields', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Submitting report...'
    });
    await loading.present();

    try {
      // Format the complete location
      const formattedLocation = `${this.issueReport.location}, ${this.issueReport.city}, ${this.issueReport.state} ${this.issueReport.postalCode}`;
      
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          await this.firestore.collection('reports').add({
            name: this.issueReport.name,
            email: this.issueReport.email,
            phone: this.issueReport.phone,
            issueType: this.issueReport.issueType,
            location: formattedLocation, // Store formatted location
            locationDetails: {
              street: this.issueReport.location,
              city: this.issueReport.city,
              state: this.issueReport.state,
              postalCode: this.issueReport.postalCode,
              coordinates: this.issueReport.coordinates
            },
            date: this.issueReport.date,
            description: this.issueReport.description,
            priority: this.issueReport.priority,
            photos: this.issueReport.photos,
            userId: this.currentUser.uid,
            userEmail: this.userEmail,
            createdAt: new Date(),
            status: 'pending'
          });
        });
      });

      await loading.dismiss();
      this.presentToast('Issue report submitted successfully!', 'success');
      
      // Reset form
      this.issueReport = {
        name: '',
        email: '',
        phone: '',
        issueType: '',
        location: '',
        city: '',
        state: '',
        postalCode: '',
        date: new Date().toISOString(),
        description: '',
        priority: 'medium',
        photos: [],
        coordinates: {
          lat: 0,
          lng: 0
        }
      };
    } catch (error) {
      await loading.dismiss();
      this.presentToast('Error submitting report. Please try again.', 'danger');
      console.error('Error:', error);
    }
  }

  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      if (image.dataUrl) {
        this.issueReport.photos.push(image.dataUrl);
      }
    } catch (error) {
      console.error('Error taking photo', error);
      this.presentToast('Could not take photo. Please try again.', 'warning');
    }
  }

  removePhoto(index: number) {
    this.issueReport.photos.splice(index, 1);
  }

  async logout() {
    try {
      await this.fireAuth.signOut();
      this.router.navigate(['/']);
    } catch (error) {
      this.presentToast('Unable to log out. Please try again.','danger');
    }
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
}