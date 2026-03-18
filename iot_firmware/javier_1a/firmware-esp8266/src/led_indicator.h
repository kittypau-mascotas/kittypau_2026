#ifndef LED_INDICATOR_H
#define LED_INDICATOR_H

void ledIndicatorInit();
void blinkLED(int times, int duration);
void startWifiBlink();
void startPortalBlink();
void stopWifiBlink();
void handleLedIndicator();

#endif