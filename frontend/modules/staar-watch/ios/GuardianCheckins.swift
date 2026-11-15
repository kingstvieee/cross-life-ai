import Foundation
import UserNotifications

/// iOS delivers these reminders while the process is suspended. They never
/// start the microphone or execute an action on the user's behalf.
enum GuardianCheckins {
  private static let prefix = "staar.guardian.checkin."
  static func status() async -> [String: Any] {
    let center = UNUserNotificationCenter.current()
    let settings = await center.notificationSettings()
    let pending = await center.pendingNotificationRequests()
    return ["supported": true, "authorization": settings.authorizationStatus.rawValue,
      "scheduled": pending.filter { $0.identifier.hasPrefix(prefix) }.count]
  }
  static func cancel() async {
    let center = UNUserNotificationCenter.current()
    let pending = await center.pendingNotificationRequests()
    center.removePendingNotificationRequests(withIdentifiers: pending.filter { $0.identifier.hasPrefix(prefix) }.map { $0.identifier })
    let delivered = await center.deliveredNotifications()
    center.removeDeliveredNotifications(withIdentifiers: delivered.filter { $0.request.identifier.hasPrefix(prefix) }.map { $0.request.identifier })
  }
  static func schedule(hour: Int, minute: Int) async throws {
    guard (0...23).contains(hour), (0...59).contains(minute) else {
      throw NSError(domain: "GuardianCheckins", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid check-in time."])
    }
    let center = UNUserNotificationCenter.current()
    guard try await center.requestAuthorization(options: [.alert, .sound]) else {
      throw NSError(domain: "GuardianCheckins", code: 2, userInfo: [NSLocalizedDescriptionKey: "Notifications are not allowed. Enable them in iPhone Settings."])
    }
    await cancel()
    let content = UNMutableNotificationContent()
    content.title = "Your Guardian check-in"
    content.body = "When you're ready, open STAAR Hub to talk or plan your next step."
    content.sound = .default
    // Device-local wall time follows the user's current time zone and DST.
    let trigger = UNCalendarNotificationTrigger(dateMatching: DateComponents(hour: hour, minute: minute), repeats: true)
    try await center.add(UNNotificationRequest(identifier: prefix + "daily", content: content, trigger: trigger))
  }
}
