import Nav from '../components/Nav'
import Footer from '../components/Footer'
import UserProfileForm from '../components/UserProfileForm'

export default function Profile() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Profile & Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Fill this in once and all 8 letters are automatically personalized. Everything stays on your device.
          </p>
        </div>
        <UserProfileForm />
      </main>
      <Footer />
    </div>
  )
}
