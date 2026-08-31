import type { Location, NavigateFunction } from 'react-router-dom';
import {
  buildReturnPathFromLocation,
  captureAuthReturnFromLocation,
  locationLikeFromReturnPath,
  storeAuthReturnPath,
} from './authReturnPath';

export function redirectToSignIn(navigate: NavigateFunction, location: Location): void {
  captureAuthReturnFromLocation(location);
  navigate('/signin', { state: { from: location } });
}

export function prepareSignInNavigation(returnPath: string) {
  const sanitized = storeAuthReturnPath(returnPath);
  const locationLike = locationLikeFromReturnPath(sanitized);
  return {
    state: { from: locationLike },
  };
}

export function prepareSignInFromCurrentPage(location: Location) {
  const returnPath = buildReturnPathFromLocation(location);
  return prepareSignInNavigation(returnPath);
}

export function captureCurrentPageForAuth(location: Location): void {
  captureAuthReturnFromLocation(location);
}
