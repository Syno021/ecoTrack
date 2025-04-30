// waste-classification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WasteClassificationService {
  // Replace with your Roboflow API key and model details
  private apiKey = 'rf_M4NlsxRxNAWd3MOE9AM55Ml5Lc92';
  private modelId = 'waste-classification'; // replace with your model ID
  private modelVersion = '1'; // replace with your model version

  constructor(private http: HttpClient) {}

  classifyWaste(imageBase64: string): Observable<any> {
    // Remove the data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    // Roboflow Inference API endpoint
    const apiUrl = `https://detect.roboflow.com/${this.modelId}/${this.modelVersion}?api_key=${this.apiKey}`;
    
    // Send the image as base64
    const body = `image=${encodeURIComponent(base64Data)}`;
    
    return this.http.post(apiUrl, body, { headers });
  }
}