import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageRecognitionPage } from './image-recognition.page';

describe('ImageRecognitionPage', () => {
  let component: ImageRecognitionPage;
  let fixture: ComponentFixture<ImageRecognitionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageRecognitionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
