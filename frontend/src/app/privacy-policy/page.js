import { useEffect } from 'react';

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-sm sm:prose max-w-none text-gray-700">
            <p>
              We respect your privacy. Our app uses WhatsApp Business API to communicate with customers.
              We do not share your information with third parties. If you have any questions,
              contact us at <a href="mailto:info@sunlitsolarindia.com" className="text-orange-600 hover:underline">support@yourcompany.com</a>.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8">Information We Collect</h2>
            <p>
              Basic contact details you provide (such as name, phone, and email) and message metadata necessary to deliver services.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6">How We Use Information</h2>
            <ul className="list-disc pl-5">
              <li>To provide quotations, invoices, and service updates</li>
              <li>To communicate via WhatsApp Business API where you have opted in</li>
              <li>To improve our services and support</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6">Data Sharing</h2>
            <p>
              We do not sell or share your personal information with third parties, except as required by law or to process communications via trusted providers.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6">Your Rights</h2>
            <p>
              You can request access, correction, or deletion of your personal information by contacting us.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6">Contact</h2>
            <p>
              Email: <a href="mailto:info@sunlitsolarindia.com" className="text-orange-600 hover:underline">info@sunlitsolarindia.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


