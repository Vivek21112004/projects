#include <AFMotor.h>
#include <VarSpeedServo.h>

VarSpeedServo servo1;
VarSpeedServo servo2;
VarSpeedServo servo3;

AF_DCMotor motorL(1);
AF_DCMotor motorR(2);
AF_DCMotor motorA(3);

int channelport[6] = {16,17,18,19,20,21};

unsigned long lastTime = 0;  // 最後に動作を実行した時間を記録する変数 time of last mode change
const unsigned long cooldownTime = 700;

int ch[6];  //each channel value

int Ch1;  //remapped channel value
int Ch2;
int Ch3;
int Ch4;
int Ch5;
int Ch6;

int maxangle_UD = 270;
int minangle_UD = 0;
int maxangle_BF = 160;
int minangle_BF = 5;
int maxangle_gripper = 32;

int mode = 0;

void mode1(int Ch2,int Ch4,int Ch3);  //DC motor controll mode(ch2 for back and forward, ch4 for posture)
void modeA(int ch1,int Ch3,int Ch5,int Ch6);  //arm mode

int map2(int value,int old_small,int old_big,int new_small,int new_big);  //remapping value

void setup() {
  // put your setup code here, to run once:
  servo1.attach(44);  //BF
  servo2.attach(45);  //UD
  servo3.attach(42);  //gripper
  motorL.run(RELEASE);
  motorR.run(RELEASE);
  motorA.run(RELEASE);
  servo1.write(10,10);
  servo2.write(10,10);
  servo3.write(10,10);

  for(int i = 0; i < 6; i++){
  pinMode(channelport[i], INPUT);
  }


  Serial.begin(9600);

}

void loop() {
  // put your main code here, to run repeatedly:
  unsigned long currentTime = millis();  // time-value of now
  static int count = 0;
  static int Ch3_past = 0;

  noInterrupts();

  for(int i = 0; i < 6; i++){
    ch[i] = pulseIn(channelport[i], HIGH);
  }
  interrupts();

  Ch1 = map2(ch[0], 1180, 1800, -255, 255);
  Ch2 = map2(ch[1], 1180, 1800, -255, 255);
  if(ch[2] <= 1100){
    Ch3 = Ch3_past;
  }else{
    Ch3 = map2(ch[2], 1180, 1800, -255, 255);
    Ch3_past = Ch3;
  }
  Ch4 = map2(ch[3], 1100, 1900, -255, 255);
  Ch5 = map2(ch[4], 1000, 2030, -255, 255);
  Ch6 = map2(ch[5], 1000, 2030, -255, 255);

  String p1 = ",";
  int dift = currentTime - lastTime;
  Serial.println(ch[0]+p1+ch[1]+p1+ch[2]+p1+ch[3]+p1+ch[4]+p1+ch[5]+p1+mode+p1+count+p1+dift);
  if (980 <= ch[2] && ch[2] <= 1020 && currentTime - lastTime >= cooldownTime){
    if(count >= 3){
      mode++; //cooldown takes 3000ms
      count = 0;
      lastTime = currentTime;
      motorL.run(RELEASE);
      motorR.run(RELEASE);
    }
    count++;
  }else{
    count = 0;
  }

  if (mode%2 == 0){
    modeALL(Ch1, Ch2, Ch3, Ch4, Ch5, Ch6);
  }else{
    modeAccurateAll(Ch1, Ch2, Ch3, Ch4, Ch5, Ch6);
  }



}

//mode function

void mode1(int Ch1, int Ch2, int Ch3){  //DC motor controll mode(ch2 for back and forward, ch4 for posture)
  //base controll(rotate and back and force are controlled respectively)
  int sp_BF, sp_LR, sp_Base;
  //controll bot
  sp_BF = abs(Ch2);
  sp_LR = abs(Ch1);
  if (abs(Ch1) < 100 && abs(Ch2) > 100){
    motorL.setSpeed(sp_BF);
    motorR.setSpeed(sp_BF);
    if (Ch2 > 0){
      motorR.run(BACKWARD);
      motorL.run(BACKWARD);
    } else{
      motorR.run(FORWARD);
      motorL.run(FORWARD);
    }
  } else if(abs(Ch1) > 100 && abs(Ch2) > 100){
    //skip
    motorL.run(RELEASE);
    motorR.run(RELEASE);

  } else if(abs(Ch1) > 100 && abs(Ch2) < 100){
    motorL.setSpeed(sp_LR);
    motorR.setSpeed(sp_LR);
    if(Ch1 < 0){
      motorL.run(FORWARD);
      motorR.run(BACKWARD);
    } else{
      motorL.run(BACKWARD);
      motorR.run(FORWARD);
    }
    
  } else{
    //skip
    motorL.run(RELEASE);
    motorR.run(RELEASE);
  }
  motorA.setSpeed(sp_Base);

  //decide motor state

  if(abs(Ch3) < 50){
    motorA.run(RELEASE);
    Serial.println("a");
  } else if(Ch3 <= -50){
    motorA.run(BACKWARD);
    Serial.println(sp_Base);
  } else{
    motorA.run(FORWARD);
  }

}


void modeA(int Ch1,int Ch3,int Ch5,int Ch6){  //arm mode
  int angleUD, angleBF, angle_gripper;
  static int temp0=0, temp1=0, temp2=0;
  int maxangle_UD = 270;
  int minangle_UD = 0;
  int maxangle_BF = 160;
  int minangle_BF = 5;

  //controll servomotor
  angleBF = map2(Ch5, -255, 255, minangle_BF, maxangle_BF);
  angleUD = map2(Ch3, -255, 255, 0, maxangle_UD);
  angle_gripper = map2(Ch6, -255, 255, 0, maxangle_gripper);

  if(abs(angleBF - temp0) > 0){
    servo1.write(angleBF, 13);
    delay(abs(angleBF - temp0) * 20);
    temp0 = angleBF;
  }
  if(abs(angleUD - temp1) > 0){
    servo2.write(angleUD, 13);
    delay(abs(angleUD - temp1) * 20);
    temp1 = angleUD;
  }
  if(abs(angle_gripper - temp2) > 0){
    servo3.write(angle_gripper, 50);
    delay(abs(angle_gripper - temp2) * 10);
    temp2 = angle_gripper;
  }

  //controll arm base
  int Ch1_remap = map2(Ch1, -255, 255, -175, 175);
  motorA.setSpeed(abs(Ch1_remap));
  if(abs(Ch1_remap) < 50){
    motorA.run(RELEASE);
  } else if(Ch1_remap <= -50){
    motorA.run(BACKWARD);
  } else{
    motorA.run(FORWARD);
  }
  String p1 = ",";
  Serial.println(angleBF+p1+angleUD+p1+angle_gripper);


}

void modeAccurate(int Ch1,int Ch3,int Ch5,int Ch6){  //arm mode
  int angleUD, angleBF, angle_gripper;
  static int temp0=0, temp1=0, temp2=0;
  minangle_BF = 40;
  maxangle_BF = 80;
  minangle_UD = 15;
  maxangle_UD = 90;

  //controll servomotor
  angleBF = map2(Ch5, -255, 255, minangle_BF, maxangle_BF);
  angleUD = map2(Ch3, -255, 255, minangle_UD, maxangle_UD);
  angle_gripper = map2(Ch6, -255, 255, 0, maxangle_gripper);

  if(abs(angleBF - temp0) > 0){
    servo1.write(angleBF, 30);
    delay(abs(angleBF - temp0) * 10);
    temp0 = angleBF;
  }
  if(abs(angleUD - temp1) > 0){
    servo2.write(angleUD, 30);
    delay(abs(angleUD - temp1) * 10);
    temp1 = angleUD;
  }
  if(abs(angle_gripper - temp2) > 0){
    servo3.write(angle_gripper, 50);
    delay(abs(angle_gripper - temp2) * 10);
    temp2 = angle_gripper;
  }

  //controll arm base
  int Ch1_remap = map2(Ch1, -255, 255, -175, 175);
  motorA.setSpeed(abs(Ch1_remap));
  if(abs(Ch1_remap) < 50){
    motorA.run(RELEASE);
  } else if(Ch1_remap <= -50){
    motorA.run(BACKWARD);
  } else{
    motorA.run(FORWARD);
  }
  String p1 = ",";
  Serial.println(angleBF+p1+angleUD+p1+angle_gripper);


}

void modeALL(int Ch1, int Ch2, int Ch3, int Ch4, int Ch5, int Ch6){
  modeA(0, Ch3, Ch5, Ch6);
  mode1(Ch1, Ch2, 0);
}

void modeAccurateAll(int Ch1, int Ch2, int Ch3, int Ch4, int Ch5, int Ch6){
  modeAccurate(0, Ch3, Ch5, Ch6);
  mode1(Ch1, Ch2, 0);
}

//function
int map2(int value, int old_small, int old_big, int new_small, int new_big) { //remapping value
    int x = map(value, old_small, old_big, new_small, new_big);
    // check
    if (x > new_big) {
        x = new_big;
    } else if (x < new_small) {
        x = new_small;
    }
    
    return x;
}







