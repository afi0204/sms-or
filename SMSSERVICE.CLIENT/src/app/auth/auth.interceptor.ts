import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Router } from "@angular/router";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(private router: Router) {

    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Use sessionStorage consistently, as it's used in your AuthGuard
        const token = sessionStorage.getItem('token');
        if (token) {
            const clonedReq = req.clone({
                headers: req.headers.set('Authorization', 'Bearer ' + token)
            });
            return next.handle(clonedReq).pipe(
                tap({
                    error: (err) => {
                        // For 401 or 403 errors, remove token and redirect to login
                        if (err.status === 401 || err.status === 403) {
                            sessionStorage.removeItem('token');
                            this.router.navigateByUrl('/auth/login');
                        }
                    }
                })
            );
        }

        return next.handle(req);
    }
}
