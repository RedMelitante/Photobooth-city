// Product-specific PDP content that is not in the Shopify catalog.
// Only the Ring Roamer has a dedicated design (PDPDesktop / PDPMobile); its
// extra sections (specs, box contents, frequently bought together, reviews,
// FAQ) live here with the design's copy. Every other product renders the
// generic ProductPage template from catalog data alone.

export interface PdpReview {
  name: string;
  profile: string;
  /** design image id ("/_blob/…") */
  avatar: string;
  when: string;
  short: string;
  full: string;
}

export interface PdpExtras {
  /** use the richer PDP layout (vertical thumbs, swatch pills, size grid) */
  layout: 'pdp';
  kicker: string;
  lead: string;
  /** replaces the catalog note under the add-to-cart button */
  note: string;
  /** image captions, desktop / mobile, by catalog image index */
  imageLabels: string[];
  imageLabelsMobile: string[];
  /** swatch colors for a Color option */
  swatches: Record<string, string>;
  description: { heading: string; paragraphs: string[]; strong: string };
  specs: { k: string; v: string }[];
  box: string[];
  soldSeparately: string;
  shipping: { lead: string; returns: string };
  faq: { heading: string; items: { q: string; a: string }[] };
  /** accessory handles for "Frequently bought together" */
  fbt: string[];
  reviews: PdpReview[];
  related: string[];
  relatedLabel: string;
}

const RING_ROAMER: PdpExtras = {
  layout: 'pdp',
  kicker: 'iPad photo booth · Roaming',
  lead: 'Just over 3 lbs with your own iPad. Programmable LED ring, redesigned V2 board.',
  note: 'iPad not included. Check the compatible sizes above.',
  imageLabels: ['Ring Roamer with programmable LED ring', 'Faceplate options: Aluminum or Sapphire Clear Glass'],
  imageLabelsMobile: ['Ring Roamer with LED ring', 'Faceplate options'],
  swatches: { Black: '#141414', White: '#F7F7F7' },
  description: {
    heading: 'Just 3 lbs after you add your own iPad Pro.',
    paragraphs: [
      'The Ring Roamer V2 has a redesigned and upgraded internal board and components, with custom-engineered programmable LED lights you control from the included Bluetooth LED controller or the button on the unit.',
      'At just over 3 lbs with your iPad, it is light enough to carry through any event. Choose a black or white body and an aluminum or Sapphire clear-glass faceplate to match your brand.',
    ],
    strong: 'Note: the iPad is not included.',
  },
  specs: [
    { k: 'Weight', v: 'Just over 3 lbs (without iPad)' },
    { k: 'Lighting', v: 'Custom-engineered programmable LED ring' },
    { k: 'Controls', v: 'Bluetooth LED controller or on-unit button' },
    { k: 'Power', v: '110V–220V power charger, 5 ft charging cable' },
    { k: 'Board', v: 'V2 — redesigned and upgraded internal board and components' },
    {
      k: 'Compatible iPads',
      v: '10.9-inch iPad Air 4th Gen and above\n10.9-inch iPad 10th Gen\n11-inch iPad Pro 4th gen and below\n11-inch iPad Pro M4\n12.9-inch iPad Pro 3rd gen and above\n13-inch iPad Air/Pro/M4',
    },
    { k: 'Patent', v: 'D916,944' },
  ],
  box: ['Ring Roamer iPad V2 (Patent # D916,944)', '5 ft charging cable', '110V–220V power charger', 'Photobooth App (free 30-day trial)', 'Bluetooth LED controller'],
  soldSeparately: 'iPad · Powerpack · Stand kit',
  shipping: { lead: 'ships within 3–5 days.', returns: 'easy returns within 7 days. See our' },
  faq: {
    heading: 'Ring Roamer Photo Booth Frequently Asked Questions',
    items: [
      { q: 'What is the Ring Roamer Photo Booth?', a: 'The Ring Roamer Photo Booth is a lightweight, portable iPad photo booth designed for weddings, parties, corporate events, brand activations and mobile photo booth businesses. It combines a compatible iPad with a programmable LED ring to create an interactive photo-taking experience.' },
      { q: 'Does the Ring Roamer Photo Booth include an iPad?', a: 'No. The iPad is not included. You will need to install your own compatible iPad in the Ring Roamer before using it with your preferred photo booth application.' },
      { q: 'Which iPad models are compatible with the Ring Roamer?', a: 'Available configurations support several iPad sizes, including the 10.9-inch iPad Air, 10th-generation 10.9-inch iPad, 11-inch iPad Pro, 12.9-inch iPad Pro and select 13-inch iPad Air and iPad Pro models. Choose the exact iPad size and generation that matches your device when ordering.' },
      { q: 'What comes with the Ring Roamer Photo Booth?', a: 'The package includes one Ring Roamer V2 photo booth, a 5-foot DC charging cable, a 110–220V power charger and a programmable control button for the LED lighting. The iPad, stand, battery pack and paid photo booth software are not included unless specifically added to your order.' },
      { q: 'Can the Ring Roamer be used as a wireless roaming photo booth?', a: 'Yes. Its lightweight design makes it suitable for roaming event photography when paired with a compatible iPad, photo booth app and optional portable power pack. A stand can also be added when you want to operate it as a stationary photo booth.' },
    ],
  },
  fbt: ['roamer-stand', '12v-rechargeable-battery-pack'],
  reviews: [
    {
      name: 'Reginald Lutes',
      profile: 'https://www.google.com/maps/contrib/102775173204515585737/reviews',
      avatar: '/_blob/de727f90aeb0122dcf523f2f1a1ffe4f',
      when: 'A year ago',
      short: 'I purchased an iPad Photo booth stand, quick shipping, very well built…',
      full: 'I purchased an iPad Photo booth stand, quick shipping, very well built, I will definitely be using Photobooth City in the future, I highly recommend it to anyone, for your Photo booth needs.',
    },
    {
      name: 'Cali Parmenter',
      profile: 'https://www.google.com/maps/contrib/116446595511945395827/reviews',
      avatar: '/_blob/a6592c79022dca943515782ea5364864',
      when: 'A year ago',
      short: 'The customer service was exceptional! We got our equipment super fast and everything looked great!',
      full: 'The customer service was exceptional! We got our equipment super fast and everything looked great! Came with great instructions for putting everything together! Couldn’t be happier :)',
    },
  ],
  related: ['mini-ring-roamer', 'wall-mount-photo-booth-for-sale', 'helio-v2-ipad-ringlight-photobooth', 'ring-roamer-sapphire-pro-ipad-mirror-photobooth'],
  relatedLabel: 'All iPad booths',
};

const EXTRAS: Record<string, PdpExtras> = {
  'ring-roamer-10-5-v2-app-controlled': RING_ROAMER,
};

export function pdpExtras(handle: string): PdpExtras | undefined {
  return EXTRAS[handle];
}

/** Google listing used by the reviews block. */
export const GOOGLE = {
  rating: '4.5',
  listing: 'https://www.google.com/maps/search/?api=1&query=Photobooth%20City&query_place_id=ChIJFf6rI_kzw4ARBfAy9F5YL3I',
  write: 'https://search.google.com/local/writereview?placeid=ChIJFf6rI_kzw4ARBfAy9F5YL3I',
};
