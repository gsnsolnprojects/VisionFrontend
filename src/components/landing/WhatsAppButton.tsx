/** Company WhatsApp number in international format, digits only (+91 77388 63939) */
const WHATSAPP_NUMBER = "917738863939";
const WHATSAPP_MESSAGE = "Hi, I'd like to know more about Vision-M.";

/** Round WhatsApp button fixed at the bottom right of the public pages. Needs the .vm2 styles. */
export const WhatsAppButton = () => (
  <a
    className="whatsapp-fab"
    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with us on WhatsApp"
    title="Chat with us on WhatsApp"
  >
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75A12.94 12.94 0 0 0 16.04 29C23.2 29 29 23.18 29 16S23.2 3 16.04 3Zm0 23.8c-2.03 0-4.02-.55-5.75-1.58l-.41-.25-3.96 1.04 1.06-3.86-.27-.4A10.73 10.73 0 0 1 5.25 16c0-5.95 4.84-10.79 10.8-10.79 5.94 0 10.76 4.84 10.76 10.79 0 5.96-4.83 10.8-10.77 10.8Zm5.91-8.08c-.32-.16-1.92-.95-2.22-1.06-.3-.11-.51-.16-.73.16-.21.32-.84 1.06-1.03 1.27-.19.22-.38.24-.7.08-.33-.16-1.37-.5-2.6-1.6-.97-.86-1.62-1.92-1.81-2.25-.19-.32-.02-.5.14-.66.15-.14.33-.38.49-.57.16-.19.21-.32.32-.54.11-.21.06-.4-.03-.57-.08-.16-.72-1.74-.99-2.38-.26-.62-.53-.54-.73-.55h-.62c-.21 0-.56.08-.86.4-.29.32-1.12 1.1-1.12 2.68 0 1.58 1.15 3.11 1.31 3.32.16.22 2.27 3.46 5.49 4.85.77.33 1.37.53 1.83.68.77.24 1.47.21 2.03.13.62-.09 1.92-.78 2.19-1.54.27-.76.27-1.41.19-1.54-.08-.14-.29-.22-.62-.38Z"
      />
    </svg>
  </a>
);
