import { Component, OnInit, Injector, runInInjectionContext, NgZone, OnDestroy, AfterViewInit, ApplicationRef, ChangeDetectorRef } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { ToastController, AlertController, Platform } from '@ionic/angular';
import * as L from 'leaflet';

interface PickupLocation {
  id: string;
  location: string;  // formerly 'name'
  address: string;
  wasteType: string;  // single waste type per schedule
  weekday: string;  // changed from date
  time: string;
  description: string;
  status: 'active' | 'cancelled';
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface AddressDetails {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: any;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: false
})
export class AdminPage implements OnInit, OnDestroy, AfterViewInit {
  selectedMainSection = 'requests-reports';
  selectedSegment = 'pending-requests';
  
  // Existing properties for requests and reports
  pendingRequests: any[] = [];
  completedRequests: any[] = [];
  pendingReports: any[] = [];
  resolvedReports: any[] = [];
  
  // Loading states for each collection
  isLoadingPendingRequests = true;
  isLoadingCompletedRequests = true;
  isLoadingPendingReports = true;
  isLoadingResolvedReports = true;
  isLoadingPickupLocations = true;

  // Map related properties
  isMapVisible = false;
  mapSearchQuery = '';
  searchResults: SearchResult[] = [];
  map: L.Map | null = null;
  marker: L.Marker | null = null;
  selectedAddress: string = '';
  addressDetails: AddressDetails = {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  };
  
  // New flag for manual address entry
  manualAddressEntry = false;

  // New properties for pickup locations
  newLocation: PickupLocation = {
    id: '',
    location: '',
    address: '',
    wasteType: '',
    weekday: '',
    time: '',
    description: '',
    status: 'active',
    coordinates: {
      lat: 0,
      lng: 0
    }
  };
  pickupLocations: PickupLocation[] = [];
  wasteTypes = [
    'recyclable',
    'organic', 
    'hazardous',
    'general waste',
    'electronic waste',
    'construction debris',
    'medical waste',
    'green waste',
    'glass',
    'plastic',
    'paper',
    'metal',
    'textile waste',
    'bulky waste',
    'liquid waste',
    'food waste',
    'radioactive waste',
    'chemical waste',
    'biodegradable',
    'non-biodegradable'
  ];
  weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  constructor(
    private fireAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private ngZone: NgZone,
    private injector: Injector,
    private changeDetector: ChangeDetectorRef,
    private platform: Platform,
    private appRef: ApplicationRef
  ) {}

  async ngOnInit() {
    // Check for authentication and admin status first
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
      
      // Load data after confirming user is authenticated and has admin rights
      this.loadData();
    });
  }

  ngAfterViewInit() {
    // Initialize map when view is ready and map section is visible
    this.initMapWhenVisible();
    
    // Force change detection after view init
    this.changeDetector.detectChanges();
  }

  ngOnDestroy() {
    // Clean up map resources
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  initMapWhenVisible() {
    // We'll check if map container exists, if not we'll wait until it's visible
    if (this.isMapVisible && !this.map) {
      setTimeout(() => {
        this.initMap();
      }, 300); // Small delay to ensure DOM is ready
    }
  }

  initMap() {
    // Check if map container exists
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map element not found');
      return;
    }

    try {
      // Initialize map with default view
      this.map = L.map('map').setView([0, 0], 2);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Add click event to map
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.reverseGeocode(e.latlng.lat, e.latlng.lng);
      });
      
      // Force map to recalculate its size
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 500);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  toggleMapVisibility() {
    this.isMapVisible = !this.isMapVisible;
    
    if (this.isMapVisible && !this.map) {
      setTimeout(() => {
        this.initMap();
      }, 300);
    } else if (this.isMapVisible && this.map) {
      // If map is already initialized, invalidate its size to ensure proper rendering
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 300);
    }
  }

  // Toggle between manual and search-based address entry
  toggleAddressEntryMode(event: any) {
    this.manualAddressEntry = event.detail.checked;
    
    if (!this.manualAddressEntry) {
      // When switching back to search mode, reset address fields
      this.resetAddressFields();
    }
  }

  resetAddressFields() {
    this.addressDetails = {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    };
    this.newLocation.address = '';
    if (this.newLocation.coordinates) {
      this.newLocation.coordinates.lat = 0;
      this.newLocation.coordinates.lng = 0;
    }
  }

  // Update full address when manual fields change
  updateFullAddress() {
    if (this.manualAddressEntry) {
      const parts = [
        this.addressDetails.street,
        this.addressDetails.city,
        this.addressDetails.state,
        this.addressDetails.postalCode,
        this.addressDetails.country
      ].filter(Boolean);
      
      this.newLocation.address = parts.join(', ');
      
      // If we have map visible, try to geocode the address to get coordinates
      if (this.isMapVisible && this.addressDetails.city && this.addressDetails.country) {
        this.geocodeManualAddress();
      }
    }
  }

  // Try to geocode manually entered address
  async geocodeManualAddress() {
    const query = [
      this.addressDetails.street,
      this.addressDetails.city,
      this.addressDetails.state,
      this.addressDetails.postalCode,
      this.addressDetails.country
    ].filter(Boolean).join(', ');
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      
      if (response.ok) {
        const results = await response.json();
        if (results.length > 0) {
          const result = results[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          
          // Update coordinates
          if (this.newLocation.coordinates) {
            this.newLocation.coordinates.lat = lat;
            this.newLocation.coordinates.lng = lng;
          } else {
            this.newLocation.coordinates = { lat, lng };
          }
          
          // Update map
          if (this.map) {
            this.map.setView([lat, lng], 16);
            
            // Add or update marker
            if (this.marker) {
              this.marker.setLatLng([lat, lng]);
            } else {
              this.marker = L.marker([lat, lng]).addTo(this.map);
            }
          }
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  }

  async searchLocation() {
    if (!this.mapSearchQuery || this.mapSearchQuery.length < 3) {
      this.searchResults = [];
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(this.mapSearchQuery)}&format=json&limit=10`
      );
      
      if (response.ok) {
        // Group results by location name for better organization
        const results = await response.json();
        this.searchResults = this.groupAndProcessResults(results);
        this.changeDetector.detectChanges(); // Force update UI with search results
      } else {
        console.error('Search failed:', response.statusText);
        this.presentToast('Location search failed', 'danger');
      }
    } catch (error) {
      console.error('Search error:', error);
      this.presentToast('Location search error', 'danger');
    }
  }

  // Group and process search results to make them more user-friendly
  groupAndProcessResults(results: SearchResult[]): SearchResult[] {
    // Add a more descriptive display_name that includes key location info
    return results.map(result => {
      const address = result.address || {};
      
      // Create a more structured display name
      const city = address.city || address.town || address.village || address.hamlet || '';
      const state = address.state || address.county || '';
      const country = address.country || '';
      
      // Create a formatted display name that's easier to read
      if (city && state && country) {
        result.display_name = `${city}, ${state}, ${country}`;
      } else if (result.display_name) {
        // Keep the original but truncate if too long
        result.display_name = result.display_name.length > 100 
          ? result.display_name.substring(0, 100) + '...'
          : result.display_name;
      }
      
      return result;
    });
  }

  selectLocation(result: SearchResult) {
    // Clear search results
    this.searchResults = [];
    
    // Get lat/lng from result
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    // Set the address
    this.selectedAddress = result.display_name;
    this.newLocation.address = result.display_name;
    
    // Store coordinates
    if (this.newLocation.coordinates) {
      this.newLocation.coordinates.lat = lat;
      this.newLocation.coordinates.lng = lng;
    } else {
      this.newLocation.coordinates = { lat, lng };
    }
    
    // Extract address components
    this.extractAddressComponents(result);
    
    // Update the map
    if (this.map) {
      this.map.setView([lat, lng], 16);
      
      // Add or update marker
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      } else {
        this.marker = L.marker([lat, lng]).addTo(this.map);
      }
    }
    
    // Force change detection
    this.changeDetector.detectChanges();
  }

  async reverseGeocode(lat: number, lng: number) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      
      if (response.ok) {
        const result = await response.json();
        
        // Set the address
        this.selectedAddress = result.display_name;
        this.newLocation.address = result.display_name;
        
        // Store coordinates
        if (this.newLocation.coordinates) {
          this.newLocation.coordinates.lat = lat;
          this.newLocation.coordinates.lng = lng;
        } else {
          this.newLocation.coordinates = { lat, lng };
        }
        
        // Extract address components
        this.extractAddressComponents(result);
        
        // Add or update marker
        if (this.map) {
          if (this.marker) {
            this.marker.setLatLng([lat, lng]);
          } else {
            this.marker = L.marker([lat, lng]).addTo(this.map);
          }
        }
        
        // Force change detection to update UI
        this.changeDetector.detectChanges();
      } else {
        console.error('Reverse geocoding failed:', response.statusText);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  }

  extractAddressComponents(result: any) {
    const address = result.address;
    
    if (address) {
      // Extract street address
      this.addressDetails.street = [
        address.house_number,
        address.road,
        address.neighbourhood
      ].filter(Boolean).join(', ');
      
      // City
      this.addressDetails.city = address.city || address.town || address.village || address.suburb || '';
      
      // State/region
      this.addressDetails.state = address.state || address.county || '';
      
      // Postal code
      this.addressDetails.postalCode = address.postcode || '';
      
      // Country
      this.addressDetails.country = address.country || '';
    }
  }

  private async checkAdminStatus(userId: string): Promise<boolean> {
    try {
      const userDoc = await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          const snapshot = await this.firestore.collection('users').doc(userId).get().toPromise();
          return snapshot;
        });
      });
      
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

  // Add this helper method at class level
  private convertTimestamps(data: any): any {
    if (!data) return data;
    
    const converted = { ...data };
    
    // Convert known timestamp fields
    const timestampFields = ['date', 'createdAt', 'updatedAt', 'resolvedAt'];
    
    for (const field of timestampFields) {
      if (converted[field] && typeof converted[field].toDate === 'function') {
        converted[field] = converted[field].toDate();
      }
    }
    
    return converted;
  }

  loadData() {
    console.log('Loading data from Firestore...');
    
    // Use runInInjectionContext to ensure proper injection context for Firebase operations
    runInInjectionContext(this.injector, () => {
      // Load pending requests
      this.isLoadingPendingRequests = true;
      this.firestore.collection('requests', ref => ref.where('status', '==', 'pending'))
        .valueChanges({ idField: 'id' })
        .subscribe({
          next: (data) => {
            console.log('Pending requests loaded:', data.length);
            this.ngZone.run(() => {
              this.pendingRequests = data.map(item => this.convertTimestamps(item));
              this.isLoadingPendingRequests = false;
              this.changeDetector.detectChanges();
            });
          },
          error: (error) => {
            console.error('Error loading pending requests:', error);
            this.ngZone.run(() => {
              this.presentToast('Error loading requests', 'danger');
              this.isLoadingPendingRequests = false;
            });
          }
        });

      // Load completed requests
      this.isLoadingCompletedRequests = true;
      this.firestore.collection('requests', ref => ref.where('status', '==', 'completed'))
        .valueChanges({ idField: 'id' })
        .subscribe({
          next: (data) => {
            console.log('Completed requests loaded:', data.length);
            this.ngZone.run(() => {
              this.completedRequests = data.map(item => this.convertTimestamps(item));
              this.isLoadingCompletedRequests = false;
              this.changeDetector.detectChanges();
            });
          },
          error: (error) => {
            console.error('Error loading completed requests:', error);
            this.ngZone.run(() => {
              this.presentToast('Error loading requests', 'danger');
              this.isLoadingCompletedRequests = false;
            });
          }
        });

      // Load pending reports
      this.isLoadingPendingReports = true;
      this.firestore.collection('reports', ref => ref.where('status', '==', 'pending'))
        .valueChanges({ idField: 'id' })
        .subscribe({
          next: (data) => {
            console.log('Pending reports loaded:', data.length);
            this.ngZone.run(() => {
              this.pendingReports = data.map(item => this.convertTimestamps(item));
              this.isLoadingPendingReports = false;
              this.changeDetector.detectChanges();
            });
          },
          error: (error) => {
            console.error('Error loading pending reports:', error);
            this.ngZone.run(() => {
              this.presentToast('Error loading reports', 'danger');
              this.isLoadingPendingReports = false;
            });
          }
        });

      // Load resolved reports
      this.isLoadingResolvedReports = true;
      this.firestore.collection('reports', ref => ref.where('status', '==', 'resolved'))
        .valueChanges({ idField: 'id' })
        .subscribe({
          next: (data) => {
            console.log('Resolved reports loaded:', data.length);
            this.ngZone.run(() => {
              this.resolvedReports = data.map(item => this.convertTimestamps(item));
              this.isLoadingResolvedReports = false;
              this.changeDetector.detectChanges();
            });
          },
          error: (error) => {
            console.error('Error loading resolved reports:', error);
            this.ngZone.run(() => {
              this.presentToast('Error loading reports', 'danger');
              this.isLoadingResolvedReports = false;
            });
          }
        });

      // Load pickup locations
      this.isLoadingPickupLocations = true;
      this.firestore.collection('schedules')
        .valueChanges({ idField: 'id' })
        .subscribe({
          next: (data) => {
            console.log('Pickup locations loaded:', data.length);
            this.ngZone.run(() => {
              this.pickupLocations = data.map(item => this.convertTimestamps(item)) as PickupLocation[];
              this.isLoadingPickupLocations = false;
              this.changeDetector.detectChanges();
            });
          },
          error: (error) => {
            console.error('Error loading schedules:', error);
            this.ngZone.run(() => {
              this.presentToast('Error loading schedules', 'danger');
              this.isLoadingPickupLocations = false;
            });
          }
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
    // Allow manual entry without coordinates, but warn about it
    if (!this.manualAddressEntry && (!this.newLocation.coordinates || this.newLocation.coordinates.lat === 0)) {
      this.presentToast('Please select a location on the map', 'warning');
      return;
    }
    
    // Ensure we have a valid address
    if (!this.newLocation.address.trim()) {
      this.presentToast('Please enter a valid address', 'warning');
      return;
    }
    
    try {
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          const docRef = await this.firestore.collection('schedules').add({
            ...this.newLocation,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          this.presentToast('Weekly collection schedule created successfully', 'success');
          
          // Reset form and map
          this.resetForm();
        });
      });
    } catch (error) {
      this.presentToast('Error creating collection schedule', 'danger');
    }
  }

  resetForm() {
    // Reset form fields
    this.newLocation = {
      id: '',
      location: '',
      address: '',
      wasteType: '',
      weekday: '',
      time: '',
      description: '',
      status: 'active',
      coordinates: {
        lat: 0,
        lng: 0
      }
    };
    
    // Reset map and search
    this.mapSearchQuery = '';
    this.selectedAddress = '';
    this.addressDetails = {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    };
    
    // Reset manual entry mode
    this.manualAddressEntry = false;
    
    // Remove marker from map
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
  }

  async deleteLocation(id: string) {
    // Add confirmation before deletion
    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this collection schedule?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
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
        }
      ]
    });
    
    await alert.present();
  }

  // Method for viewing images
  async viewImage(photo: string) {
    // Create a modal to view the image in larger size
    const alert = await this.alertController.create({
      header: 'Image',
      message: `<div class="image-modal"><img src="${photo}" alt="Report image" /></div>`,
      buttons: ['Close']
    });
    
    await alert.present();
  }

  async logout() {
    try {
      await this.fireAuth.signOut();
      this.router.navigate(['/home']);
    } catch (error) {
      this.presentToast('Unable to log out. Please try again.','danger');
    }
  }
}