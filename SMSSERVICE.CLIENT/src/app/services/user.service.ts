import { Injectable } from '@angular/core';

import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { FormGroup } from '@angular/forms';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from 'src/environments/environment';
import { User, UserView, ChangePasswordModel, UserList, UserPost } from 'src/models/auth/userDto';
import { ResponseMessage, SelectList } from 'src/models/ResponseMessage.Model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  readonly BaseURI = environment.baseUrl;
  readonly HubUri = environment.assetUrl;

  private hubConnection: signalR.HubConnection;
  private forceLogoutSubject = new Subject<void>();

  forceLogout$ = this.forceLogoutSubject.asObservable();

  constructor(private http: HttpClient) {}

  // In user.service.ts
initializeSignalRConnection(token: string): Promise<void> {
  this.hubConnection = new signalR.HubConnectionBuilder()
    .withUrl(this.HubUri + '/notificationHub', { accessTokenFactory: () => token })
    .build();

  // Start the connection and return a promise
  return this.hubConnection.start()
    .then(() => {
      console.log('SignalR Connection Established');
      // Listen for hub events here to centralize logic
      this.hubConnection.on('ForceLogout', () => {
        this.forceLogout();
      });
    })
    .catch(err => {
      console.error('SignalR Connection Error: ', err);
      throw err; // Re-throw error to be handled in caller
    });
}


  forceLogout() {
    sessionStorage.removeItem('token');
    this.stopSignalRConnection();
    this.forceLogoutSubject.next();
  }

  stopSignalRConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }



  comparePasswords(fb: FormGroup) {
    let confirmPswrdCtrl = fb.get('ConfirmPassword');
    if (confirmPswrdCtrl!.errors == null || 'passwordMismatch' in confirmPswrdCtrl!.errors) {
      if (fb.get('Password')!.value != confirmPswrdCtrl!.value) confirmPswrdCtrl!.setErrors({ passwordMismatch: true });
      else confirmPswrdCtrl!.setErrors(null);
    }
  }

  register(body: User) {
    return this.http.post(this.BaseURI + '/Authentication/Register', body);
  }

  login(formData: User) {
    return this.http.post<ResponseMessage>(this.BaseURI + '/Authentication/Login', formData);
  }
  public getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  logout() {
    this.stopSignalRConnection();
    return this.http.post<ResponseMessage>(this.BaseURI + '/Authentication/Logout', {});
  }

  // getUserProfile() {
  //   return this.http.get(this.BaseURI + '/UserProfile');
  // }

  roleMatch(allowedRoles: string[]): boolean {
    const token = sessionStorage.getItem('token');
    if (!token) {
      return false;
    }

    try {
      const payLoad = this.decodeJWT(token)?.payload;
      if (!payLoad || !payLoad.role) {
        return false;
      }

      const userRoles: string[] = Array.isArray(payLoad.role) ? payLoad.role.map(String) : String(payLoad.role).split(',');

      // Use .some() for a more efficient and correct check
      return allowedRoles.some((role) => userRoles.includes(role));
    } catch (error) {
      console.error('Error decoding JWT in roleMatch', error);
      return false;
    }
  }

  getRoles() {
    return this.http.get<SelectList[]>(this.BaseURI + '/Authentication/getroles');
  }

  getCurrentUser() {
    var token = sessionStorage.getItem('token');

    const payLoad = this.decodeJWT(token);

    if (payLoad) {
      var userValue = payLoad.payload;
      let user: UserView = {
        userId: userValue.userId,
        fullName: userValue.name,
        role: userValue.role.split(','),
        organizationId: userValue.organizationId,
        photo: userValue.photo
      };

      console.log('user', user);

      return user;
    }

    return null;
  }

  private decodeJWT(token: string | null): { header: any; payload: any; signature: string } | null {
    if (!token) {
      return null;
    }
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT: The token must have 3 parts');
      }
      const [headerB64, payloadB64, signature] = parts;

      const payloadJson = decodeURIComponent(
        atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );

      const headerJson = decodeURIComponent(
        atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );

      return { header: JSON.parse(headerJson), payload: JSON.parse(payloadJson), signature };
    } catch (error) {
      console.error('Failed to decode JWT', error);
      return null;
    }
  }

  changePassword(formData: ChangePasswordModel) {
    return this.http.post<ResponseMessage>(this.BaseURI + '/Authentication/ChangePassword', formData);
  }

  getUserList() {
    return this.http.get<UserList[]>(this.BaseURI + '/Authentication/GetUserList');
  }

  createUser(body: UserPost) {
    return this.http.post<ResponseMessage>(this.BaseURI + '/Authentication/AddUser', body);
  }

  getRoleCategory() {
    return this.http.get<SelectList[]>(this.BaseURI + '/Authentication/GetRoleCategory');
  }

  getNotAssignedRole(userId: string) {
    return this.http.get<SelectList[]>(this.BaseURI + `/Authentication/GetNotAssignedRole?userId=${userId}`);
  }
  getAssignedRole(userId: string) {
    return this.http.get<SelectList[]>(this.BaseURI + `/Authentication/GetAssignedRoles?userId=${userId}`);
  }
  assignRole(body: any) {
    return this.http.post<ResponseMessage>(this.BaseURI + '/Authentication/AssingRole', body);
  }
  revokeRole(body: any) {
    return this.http.post<ResponseMessage>(this.BaseURI + '/Authentication/RevokeRole', body);
  }
  // getSystemUsers() {
  //   return this.http.get<Employee[]>(this.BaseURI + "/Authentication/users")
  // }

}
