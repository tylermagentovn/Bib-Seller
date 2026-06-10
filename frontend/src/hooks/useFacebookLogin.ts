declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

let sdkPromise: Promise<void> | null = null;

function loadFBSdk(appId: string): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve) => {
    if (window.FB) { resolve(); return; }
    window.fbAsyncInit = () => {
      window.FB.init({ appId, cookie: true, xfbml: false, version: "v18.0" });
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });
  return sdkPromise;
}

export function useFacebookLogin() {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID as string;

  return async function loginWithFacebook(): Promise<string> {
    await loadFBSdk(appId);
    return new Promise((resolve, reject) => {
      window.FB.login(
        (response: any) => {
          if (response?.authResponse?.accessToken) {
            resolve(response.authResponse.accessToken);
          } else {
            reject(new Error("cancelled"));
          }
        },
        { scope: "email,public_profile" }
      );
    });
  };
}
