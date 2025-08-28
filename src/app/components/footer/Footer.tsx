import { FaInstagram, FaTiktok, FaFacebook } from "react-icons/fa";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: "Instagram",
      icon: FaInstagram,
      url: "https://instagram.com/pinakacutenaartclub", // Replace with your actual Instagram URL
      color: "hover:text-pink-500",
    },
    {
      name: "TikTok",
      icon: FaTiktok,
      url: "https://tiktok.com/@pinakacutenaartclub", // Replace with your actual TikTok URL
      color: "hover:text-gray-700",
    },
    {
      name: "Facebook",
      icon: FaFacebook,
      url: "https://facebook.com/share/g/16eaFsqYws", // Replace with your actual Facebook URL
      color: "hover:text-blue-600",
    },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Social Media and Bottom Bar */}
        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {/* Social Media Icons */}
            <div className="flex space-x-6 mb-4 md:mb-0">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-gray-400 ${social.color} transition-colors duration-200 transform hover:scale-110`}
                    aria-label={`Follow us on ${social.name}`}
                  >
                    <IconComponent size={24} />
                  </a>
                );
              })}
            </div>

            {/* Copyright */}
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm">
                © {currentYear} Meraki. All rights reserved.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Made with ❤️ for better experiences
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
