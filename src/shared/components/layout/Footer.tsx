import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4 flex items-center">
              <img
                src="/uploads/82e73a70-07ff-410e-b9f5-906aa4d1b00c.png"
                alt="TrafficMENA Logo"
                className="h-8 w-8 object-contain"
              />
              <span className="ml-3 text-lg font-bold">TrafficMENA</span>
            </div>
            <p className="mb-4 max-w-md text-gray-300">
              The premier digital marketing community in the MENA region. Connect, learn, and grow
              with industry professionals through our meetups and resources.
            </p>
            <div className="flex space-x-4">
              {/* Social Media Icons with Security Attributes */}
              <a
                href="https://x.com/trafficmena"
                className="text-gray-300 transition-colors duration-200 hover:text-primary-green"
                rel="noopener noreferrer"
                target="_blank"
                aria-label="Follow us on X (formerly Twitter)"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="sr-only">Follow TrafficMENA on X (formerly Twitter)</span>
              </a>
              <a
                href="https://facebook.com/trafficmena"
                className="text-gray-300 transition-colors duration-200 hover:text-primary-green"
                rel="noopener noreferrer"
                target="_blank"
                aria-label="Follow us on Facebook"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="sr-only">Follow TrafficMENA on Facebook</span>
              </a>
              <a
                href="https://linkedin.com/company/trafficmena"
                className="text-gray-300 transition-colors duration-200 hover:text-primary-green"
                rel="noopener noreferrer"
                target="_blank"
                aria-label="Follow us on LinkedIn"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span className="sr-only">Follow TrafficMENA on LinkedIn</span>
              </a>
              <a
                href="https://instagram.com/trafficmena"
                className="text-gray-300 transition-colors duration-200 hover:text-primary-green"
                rel="noopener noreferrer"
                target="_blank"
                aria-label="Follow us on Instagram"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span className="sr-only">Follow TrafficMENA on Instagram</span>
              </a>
              <a
                href="https://tiktok.com/@trafficmena"
                className="text-gray-300 transition-colors duration-200 hover:text-primary-green"
                rel="noopener noreferrer"
                target="_blank"
                aria-label="Follow us on TikTok"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
                <span className="sr-only">Follow TrafficMENA on TikTok</span>
              </a>
              <a
                href="https://threads.net/@trafficmena"
                className="text-gray-300 transition-colors duration-200 hover:text-primary-green"
                rel="noopener noreferrer"
                target="_blank"
                aria-label="Follow us on Threads"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.743-1.758-.448-.518-1.092-.777-1.917-.773-.906.006-1.602.359-2.069 1.051-.144.213-.26.461-.35.742l-1.961-.493c.145-.434.353-.84.621-1.21C9.4 6.558 10.72 5.83 12.514 5.824c1.312-.005 2.364.351 3.132 1.06.72.665 1.188 1.643 1.395 2.912.26 1.579-.014 3.176-.814 4.746-.2.393-.264.645-.191.92.411 1.567.367 3.293-.956 4.86-1.11 1.311-2.934 2.27-5.96 2.502-.24.018-.48.027-.72.027zm1.648-8.22c-.244-.091-.52-.12-.785-.086-.985.126-1.85.47-2.5 1.035-.81.70-1.226 1.694-1.16 2.795.044.73.412 1.401.954 1.746.71.453 1.676.294 2.61-.043.845-.306 1.52-.816 2.06-1.516.71-1.018 1.098-2.353 1.098-3.931z" />
                </svg>
                <span className="sr-only">Follow TrafficMENA on Threads</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-primary-green">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/meetups"
                  className="text-gray-300 transition-colors duration-200 hover:text-primary-green"
                >
                  Meetups
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-gray-300 transition-colors duration-200 hover:text-primary-green"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-primary-green">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy"
                  className="text-gray-300 transition-colors duration-200 hover:text-primary-green"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-gray-300 transition-colors duration-200 hover:text-primary-green"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-gray-700 pt-8 text-center">
          <p className="text-gray-300">
            © 2024 TrafficMENA. All rights reserved. | Digital Marketing Community for the MENA
            Region
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
