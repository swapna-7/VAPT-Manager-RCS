import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Shield, Users, Lock, CheckCircle, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">


      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            VAPT Management Portal
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive vulnerability assessment and penetration testing management platform
          </p>
        </div>
       

        {/* Sign Up Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Client Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-6 text-white">
              <div className="h-14 w-14 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">For Organizations</h2>
              <p className="text-purple-100 text-sm">
                Register your organization and request security testing services
              </p>
            </div>
            
            <div className="p-6">
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Select from Web, Android, and iOS testing services</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Manage team members and access controls</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Track vulnerabilities and remediation progress</span>
                </li>
              </ul>
              
              <div className="space-y-3">
                <Link 
                  href="/auth/client-sign-up" 
                  className="group w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Sign up as Client
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href="/auth/login" 
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-purple-200 text-purple-700 font-semibold hover:bg-purple-50 transition-all duration-200"
                >
                  Login to Account
                </Link>
              </div>
            </div>
          </div>

          {/* Staff Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
              <div className="h-14 w-14 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">For Security Team</h2>
              <p className="text-blue-100 text-sm">
                Staff access for administrators and security professionals
              </p>
            </div>
            
            <div className="p-6">
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Manage client organizations and requests</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Conduct security assessments and testing</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Generate reports and track deliverables</span>
                </li>
              </ul>
              
              <div className="space-y-3">
                <Link 
                  href="/auth/staff-sign-up" 
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-blue-200 text-blue-700 font-semibold hover:bg-blue-50 transition-all duration-200"
                >
                  Register as Staff
                </Link>
                <Link 
                  href="/auth/login" 
                  className="group w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Staff Login
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">
            Secure. Professional. Reliable. • Protecting digital assets since 2024
          </p>
        </div> */}
      </div>
    </main>
  );
}
