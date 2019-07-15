export interface UserData {
  active: boolean;
  currentWatchesId: string;
  displayName: string;
  invalid: boolean;
  lastUpdated: FirebaseFirestore.Timestamp | null;
  nextCursor: string;
  newUser: boolean;
  photoUrl: string;
}

export interface UserRecordData {
  cameUsers: UserRecordUserItemData[];
  leftUsers: UserRecordUserItemData[];
  durationStart: FirebaseFirestore.Timestamp;
  durationEnd: FirebaseFirestore.Timestamp;
}

export interface UserRecordUserItemData {
  id: string;
  name?: string;
  photoUrl?: string;
  screenName?: string;
  detail?: boolean;
}

export interface UserWatchData {
  followers: string[];
  getStartDate: FirebaseFirestore.Timestamp;
  getEndDate: FirebaseFirestore.Timestamp;
}

export interface TokenData {
  twitterAccessToken: string;
  twitterAccessTokenSecret: string;
  twitterId: string;
}
