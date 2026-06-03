import mongoose, { Schema, Document } from "mongoose";

// ─── User ────────────────────────────────────────────────────
export interface IUser extends Document {
  name?: string;
  email?: string;
  password?: string;
  isAdmin: boolean;
  adminRole: "super_admin" | "moderator" | "analyst";
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  fcmToken?: string;
  streakDays?: number;
  preferences?: { notificationsEnabled?: boolean; reminderTime?: string };
  createdAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:          { type: String },
    email:         { type: String },
    password:      { type: String },
    isAdmin:       { type: Boolean, default: false },
    adminRole:     { type: String, enum: ["super_admin", "moderator", "analyst"], default: "analyst" },
    isActive:      { type: Boolean, default: true },
    isBanned:      { type: Boolean, default: false },
    banReason:     { type: String },
    fcmToken:      { type: String },
    streakDays:    { type: Number },
    preferences: {
      notificationsEnabled: { type: Boolean },
      reminderTime:         { type: String },
    },
  },
  { collection: "users", timestamps: true }
);

export const User = mongoose.models.User
  ? (mongoose.model("User") as mongoose.Model<IUser>)
  : mongoose.model<IUser>("User", UserSchema);

// ─── Professional ────────────────────────────────────────────
export interface IProfessional extends Document {
  firstName?: string;
  lastName?: string;
  photo?: string;
  type?: string;
  specialties?: string[];
  city?: string;
  phone?: string;
  email?: string;
  sessionPrice?: number;
  currency?: string;
  isActive?: boolean;
  isVerified?: boolean;
  totalBookings?: number;
  rating?: number;
}

const ProfessionalSchema = new Schema<IProfessional>(
  {
    firstName:     { type: String },
    lastName:      { type: String },
    photo:         { type: String },
    type:          { type: String },
    specialties:   [{ type: String }],
    city:          { type: String },
    phone:         { type: String },
    email:         { type: String },
    sessionPrice:  { type: Number },
    currency:      { type: String },
    isActive:      { type: Boolean },
    isVerified:    { type: Boolean },
    totalBookings: { type: Number },
    rating:        { type: Number },
  },
  { collection: "professionals", timestamps: true }
);

export const Professional = mongoose.models.Professional
  ? (mongoose.model("Professional") as mongoose.Model<IProfessional>)
  : mongoose.model<IProfessional>("Professional", ProfessionalSchema);

// ─── Booking ─────────────────────────────────────────────────
export interface IBooking extends Document {
  user:             mongoose.Types.ObjectId;
  professional:     mongoose.Types.ObjectId;
  message?:         string;
  preferredDate?:   string;
  preferredTime?:   string;
  consultationType: "in_person" | "online";
  status:           "pending" | "confirmed" | "cancelled" | "completed";
  sessionPrice?:    number;
  commissionRate:   number;
  commissionAmount?: number;
  adminNote?:       string;
  confirmedAt?:     Date;
  cancelledAt?:     Date;
  createdAt?:       Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user:             { type: Schema.Types.ObjectId, ref: "User",         required: true },
    professional:     { type: Schema.Types.ObjectId, ref: "Professional", required: true },
    message:          { type: String },
    preferredDate:    { type: String },
    preferredTime:    { type: String },
    consultationType: { type: String, enum: ["in_person", "online"], default: "in_person" },
    status:           { type: String, enum: ["pending", "confirmed", "cancelled", "completed"], default: "pending" },
    sessionPrice:     { type: Number },
    commissionRate:   { type: Number, default: 0.1 },
    commissionAmount: { type: Number },
    adminNote:        { type: String },
    confirmedAt:      { type: Date },
    cancelledAt:      { type: Date },
  },
  { collection: "bookings", timestamps: true }
);

export const Booking = mongoose.models.Booking
  ? (mongoose.model("Booking") as mongoose.Model<IBooking>)
  : mongoose.model<IBooking>("Booking", BookingSchema);

// ─── Post ────────────────────────────────────────────────────
export interface IPost extends Document {
  author?:           mongoose.Types.ObjectId;
  content?:          string;
  postType?:         string;
  isAnonymous?:      boolean;
  isVisible:         boolean;
  deletedAt?:        Date | null;
  reportCount:       number;
  reports?: Array<{
    user?:       mongoose.Types.ObjectId;
    reason?:     string;
    details?:    string;
    status:      "pending" | "reviewed" | "dismissed";
    reportedAt?: Date;
  }>;
  likesCount?:        number;
  sameFeelingsCount?: number;
  commentsCount?:     number;
  createdAt?:         Date;
}

const PostSchema = new Schema<IPost>(
  {
    author:      { type: Schema.Types.ObjectId, ref: "User" },
    content:     { type: String },
    postType:    { type: String },
    isAnonymous: { type: Boolean },
    isVisible:   { type: Boolean, default: true },
    deletedAt:   { type: Date, default: null },
    reportCount: { type: Number, default: 0 },
    reports: [
      {
        user:       { type: Schema.Types.ObjectId, ref: "User" },
        reason:     { type: String },
        details:    { type: String },
        status:     { type: String, enum: ["pending", "reviewed", "dismissed"], default: "pending" },
        reportedAt: { type: Date },
      },
    ],
    likesCount:        { type: Number, default: 0 },
    sameFeelingsCount: { type: Number, default: 0 },
    commentsCount:     { type: Number, default: 0 },
  },
  { collection: "posts", timestamps: true }
);

export const Post = mongoose.models.Post
  ? (mongoose.model("Post") as mongoose.Model<IPost>)
  : mongoose.model<IPost>("Post", PostSchema);

// ─── Challenge ───────────────────────────────────────────────
export interface IChallenge extends Document {
  title: string;
  description: string;
  instructions?: string[];
  category: string;
  difficulty: string;
  durationMinutes: number;
  points: number;
  icon: string;
  completionType?: any;
  isPremium: boolean;
  isActive: boolean;
  targetLevel?: string;
  order?: number;
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    title:           { type: String, required: true },
    description:     { type: String, required: true },
    instructions:    [{ type: String }],
    category:        { type: String, required: true },
    difficulty:      { type: String, default: "easy" },
    durationMinutes: { type: Number, required: true },
    points:          { type: Number, required: true },
    icon:            { type: String, required: true },
    completionType:  { type: Schema.Types.Mixed },
    isPremium:       { type: Boolean, default: false },
    isActive:        { type: Boolean, default: true },
    targetLevel:     { type: String },
    order:           { type: Number, default: 0 },
  },
  { collection: "challenges", timestamps: true }
);

export const Challenge = mongoose.models.Challenge
  ? (mongoose.model("Challenge") as mongoose.Model<IChallenge>)
  : mongoose.model<IChallenge>("Challenge", ChallengeSchema);

// ─── Ad ──────────────────────────────────────────────────────
export interface IAd extends Document {
  title: string;
  description?: string;
  imageUrl?: string;
  emoji?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  category: string;
  placement: string[];
  advertiser?: string;
  impressions: number;
  clicks: number;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  targetAgeMin?: number;
  targetAgeMax?: number;
  targetCity?: string;
}

const AdSchema = new Schema<IAd>(
  {
    title:        { type: String, required: true, maxlength: 60 },
    description:  { type: String, maxlength: 120 },
    imageUrl:     { type: String },
    emoji:        { type: String, default: "🌿" },
    ctaLabel:     { type: String, default: "En savoir plus", maxlength: 30 },
    ctaUrl:       { type: String },
    category:     { type: String, enum: ["prevention", "wellness", "local_product", "event", "service"], default: "wellness" },
    placement:    [{ type: String, enum: ["community_feed", "mood_screen", "challenges_screen"] }],
    advertiser:   { type: String },
    impressions:  { type: Number, default: 0 },
    clicks:       { type: Number, default: 0 },
    isActive:     { type: Boolean, default: true },
    startsAt:     { type: Date },
    endsAt:       { type: Date },
    targetAgeMin: { type: Number },
    targetAgeMax: { type: Number },
    targetCity:   { type: String },
  },
  { collection: "ads", timestamps: true }
);

export const Ad = mongoose.models.Ad
  ? (mongoose.model("Ad") as mongoose.Model<IAd>)
  : mongoose.model<IAd>("Ad", AdSchema);

// ─── AppConfig ───────────────────────────────────────────────
export interface IAppConfig extends Document {
  key: string;
  value: any;
  description?: string;
  isPublic?: boolean;
}

const AppConfigSchema = new Schema<IAppConfig>(
  {
    key:         { type: String, required: true, unique: true },
    value:       { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    isPublic:    { type: Boolean, default: false },
  },
  { collection: "appconfigs", timestamps: true }
);

export const AppConfig = mongoose.models.AppConfig
  ? (mongoose.model("AppConfig") as mongoose.Model<IAppConfig>)
  : mongoose.model<IAppConfig>("AppConfig", AppConfigSchema);
