import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings - Admin - Web Radio Test',
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600">Configure platform-wide settings</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Name
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                value="Web Radio Test"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geohash Precision
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                defaultValue={7}
              />
              <p className="text-xs text-gray-500 mt-1">For benchmark aggregates</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enable User Registrations
              </label>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" defaultChecked />
                <span className="text-sm text-gray-600">Allow new users to sign up</span>
              </div>
            </div>
          </div>
        </div>

        <hr />

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cellfile Deduplication</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance Threshold (meters)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                defaultValue={30}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Azimuth Threshold (degrees)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                defaultValue={10}
              />
            </div>
          </div>
        </div>

        <button className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
          Save Settings
        </button>
      </div>
    </div>
  )
}
