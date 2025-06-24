export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isPortrait: boolean;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  hasVibration: boolean;
  hasBatteryAPI: boolean;
}

export class DeviceDetection {
  private static instance: DeviceDetection;
  private deviceInfo: DeviceInfo;
  private orientationCallbacks: ((isPortrait: boolean) => void)[] = [];

  private constructor() {
    this.deviceInfo = this.detectDevice();
    this.setupOrientationListener();
  }

  static getInstance(): DeviceDetection {
    if (!DeviceDetection.instance) {
      DeviceDetection.instance = new DeviceDetection();
    }
    return DeviceDetection.instance;
  }

  private detectDevice(): DeviceInfo {
    const ua = navigator.userAgent.toLowerCase();
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Mobile detection
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|windows phone/.test(ua) || hasTouch;
    const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);
    
    return {
      isMobile: isMobile && !isTablet,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      hasTouch,
      isIOS,
      isAndroid,
      isPortrait: window.innerHeight > window.innerWidth,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      hasVibration: 'vibrate' in navigator,
      hasBatteryAPI: 'getBattery' in navigator
    };
  }

  private setupOrientationListener(): void {
    window.addEventListener('resize', () => {
      const wasPortrait = this.deviceInfo.isPortrait;
      this.deviceInfo.isPortrait = window.innerHeight > window.innerWidth;
      this.deviceInfo.screenWidth = window.innerWidth;
      this.deviceInfo.screenHeight = window.innerHeight;
      
      if (wasPortrait !== this.deviceInfo.isPortrait) {
        this.orientationCallbacks.forEach(cb => cb(this.deviceInfo.isPortrait));
      }
    });
  }

  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  isMobileDevice(): boolean {
    return this.deviceInfo.isMobile || this.deviceInfo.isTablet;
  }

  onOrientationChange(callback: (isPortrait: boolean) => void): void {
    this.orientationCallbacks.push(callback);
  }

  vibrate(pattern: number | number[]): void {
    if (this.deviceInfo.hasVibration && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  async getBatteryLevel(): Promise<number | null> {
    if (this.deviceInfo.hasBatteryAPI && 'getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return battery.level;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Helper to determine quality settings based on device
  getRecommendedQuality(): 'low' | 'medium' | 'high' {
    const pixelCount = this.deviceInfo.screenWidth * this.deviceInfo.screenHeight * this.deviceInfo.devicePixelRatio;
    
    // Low-end devices
    if (pixelCount < 1000000 || this.deviceInfo.devicePixelRatio > 2.5) {
      return 'low';
    }
    // High-end devices
    else if (pixelCount > 2000000 && this.deviceInfo.devicePixelRatio <= 2) {
      return 'high';
    }
    // Mid-range devices
    return 'medium';
  }

  // Detect if device is in power saving mode (heuristic)
  isPowerSavingMode(): boolean {
    // On iOS, frame rate might be limited in low power mode
    // This is a heuristic approach
    return this.deviceInfo.devicePixelRatio > 2 && this.getRecommendedQuality() === 'low';
  }

  // Get safe area insets for devices with notches
  getSafeAreaInsets() {
    // CSS environment variables for safe areas (iOS)
    const computedStyle = getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0')
    };
  }
}