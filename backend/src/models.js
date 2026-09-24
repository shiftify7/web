import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    name: String,
    phone: { type: String, index: true },
    email: String,
    moveType: { type: String, enum: ['INTRA_CITY', 'INTERCITY', 'INTERSTATE'], index: true },
    fromCity: String,
    fromState: String,
    fromLocality: String,
    toCity: String,
    toState: String,
    toLocality: String,
    from: String,
    to: String,
    propertyType: String,
    movingDate: String,
    message: String,
    source: String,
    landingPage: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,
    gclid: String,
    verificationEnabled: { type: Boolean, default: false },
    verificationStatus: { type: String, default: 'NONE' },
    leadStatus: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED', 'LOST'],
      default: 'NEW',
      index: true,
    },
    notes: { type: String, default: '' },
    followUpDate: String,
    emailNotificationStatus: { type: String, default: 'PENDING' },
  },
  { timestamps: true },
);
leadSchema.index({ createdAt: -1 });

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, default: 'owner' },
});

const settingsSchema = new mongoose.Schema({
  otpEnabled: { type: Boolean, default: false },
  phone: String,
  whatsapp: String,
  email: String,
  address: String,
  blogAuthorDefault: String,
  business: { type: Object, default: {} },
  businessSources: { type: Object, default: {} },
});

const otpSchema = new mongoose.Schema({
  phone: String,
  hash: String,
  expiresAt: Date,
  attempts: { type: Number, default: 0 },
  used: { type: Boolean, default: false },
  payload: Object,
  createdAt: { type: Date, default: Date.now },
});
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const blogSchema = new mongoose.Schema(
  {
    title: String,
    slug: { type: String, unique: true, index: true },
    excerpt: String,
    featuredImage: String,
    bannerImage: String,
    content: String,
    contentMode: { type: String, enum: ['markdown', 'html'], default: 'markdown' },
    seoTitle: String,
    seoDescription: String,
    canonicalUrl: String,
    tags: [String],
    category: { type: String, index: true },
    author: String,
    featured: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['draft', 'published', 'unpublished'], default: 'draft', index: true },
    publishedAt: { type: Date, index: true },
  },
  { timestamps: true },
);
blogSchema.index({ status: 1, publishedAt: -1 });

const MEDIA_CATS = ['LANDING_PAGE', 'BLOG', 'REVIEW', 'SERVICE', 'CITY', 'LOCALITY', 'GENERAL'];
const MEDIA_SECTIONS = [
  'HERO', 'ABOUT', 'SERVICES', 'PROCESS', 'WHY_SHIFTIFY', 'PACKING',
  'HOUSE_SHIFTING', 'OFFICE_SHIFTING', 'INTERCITY', 'VEHICLE_MOVING',
  'TESTIMONIALS', 'CTA', 'FOOTER', 'OTHER',
];

const mediaSchema = new mongoose.Schema(
  {
    publicId: String,
    url: String,
    title: { type: String, default: '' },
    alt: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, enum: MEDIA_CATS, default: 'GENERAL', index: true },
    section: { type: String, enum: MEDIA_SECTIONS, default: 'OTHER', index: true },
    width: Number,
    height: Number,
    format: String,
    bytes: Number,
    locationSlug: { type: String, default: '', index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);
mediaSchema.index({ category: 1, section: 1, isActive: 1, sortOrder: 1 });

const announcementSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  text: String,
  link: String,
  startDate: Date,
  endDate: Date,
  position: { type: String, enum: ['LEFT', 'CENTER', 'RIGHT'], default: 'CENTER' },
  background: { type: String, default: '#1e3a8a' },
  textColor: { type: String, default: '#ffffff' },
  ctaLabel: String,
  ctaUrl: String,
});

export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
export const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema);
export const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
export const Media = mongoose.models.Media || mongoose.model('Media', mediaSchema);
export const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    text: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    image: { type: String, default: '' },
    status: { type: String, enum: ['published', 'unpublished'], default: 'unpublished', index: true },
  },
  { timestamps: true },
);
reviewSchema.index({ status: 1, createdAt: -1 });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
