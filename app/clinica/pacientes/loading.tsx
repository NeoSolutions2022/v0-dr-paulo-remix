export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-64 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="border rounded-lg">
        <div className="p-6 border-b">
          <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
