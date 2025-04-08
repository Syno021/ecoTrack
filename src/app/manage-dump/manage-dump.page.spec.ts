import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageDumpPage } from './manage-dump.page';

describe('ManageDumpPage', () => {
  let component: ManageDumpPage;
  let fixture: ComponentFixture<ManageDumpPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageDumpPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
