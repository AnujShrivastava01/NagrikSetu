const Report = require('../models/Report');
const { sendDailySummary, sendWeatherAffectedReportNotification } = require('./emailService'); // Import sendWeatherAffectedReportNotification
const { getCurrentWeather } = require('./weatherService'); // Import weatherService

/**
 * Generate daily statistics
 */
async function generateDailyStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const stats = await Report.aggregate([
    {
      $match: {
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      }
    },
    {
      $group: {
        _id: null,
        newReports: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        verified: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } }
      }
    }
  ]);

  return stats[0] || {
    newReports: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    pending: 0,
    verified: 0,
    inProgress: 0
  };
}

/**
 * Send daily summary email to admins and weather notifications to users
 */
async function sendDailySummaryEmail() {
  try {
    const stats = await generateDailyStats();
    
    // Send daily summary to admins
    if (stats.newReports > 0 || stats.resolved > 0) {
      const result = await sendDailySummary(stats);
      
      if (result.success) {
        console.log('Daily summary email to admins sent successfully');
      } else {
        console.error('Failed to send daily summary email to admins:', result.error);
      }
    } else {
      console.log('No new activity for admin daily summary, skipping email');
    }

    // --- Weather-based notifications for users ---
    console.log('Checking for weather-affected reports...');
    const activeReports = await Report.find({
      status: { $in: ['pending', 'verified', 'in-progress'] }
    }).populate('reporter'); // Populate reporter to get email

    const twentyFourHoursAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));

    for (const report of activeReports) {
      if (report.location && report.location.coordinates && report.reporter?.email) {
        // Only send if no notification sent before or if it was sent more than 24 hours ago
        if (!report.lastWeatherNotificationSentAt || report.lastWeatherNotificationSentAt < twentyFourHoursAgo) {
          const { latitude, longitude } = report.location.coordinates;
          const weatherData = await getCurrentWeather(latitude, longitude);

          if (weatherData && (
            weatherData.condition.toLowerCase().includes('rain') ||
            weatherData.condition.toLowerCase().includes('drizzle') ||
            weatherData.condition.toLowerCase().includes('snow') ||
            weatherData.condition.toLowerCase().includes('storm') ||
            weatherData.condition.toLowerCase().includes('thunderstorm')
          )) {
            console.log(`Sending weather notification for report ${report._id}: ${weatherData.condition}`);
            const notificationResult = await sendWeatherAffectedReportNotification(report, weatherData);

            if (notificationResult.success) {
              // Update the report with the new notification timestamp
              await Report.findByIdAndUpdate(report._id, { lastWeatherNotificationSentAt: new Date() });
              console.log(`Updated lastWeatherNotificationSentAt for report ${report._id}`);
            } else {
              console.error(`Failed to send weather notification for report ${report._id}:`, notificationResult.error);
            }
          } else {
            // If weather is clear, and a previous notification was sent, reset the timestamp
            // This prevents repeated notifications if weather clears up and then becomes bad again
            if (report.lastWeatherNotificationSentAt) {
                await Report.findByIdAndUpdate(report._id, { lastWeatherNotificationSentAt: null });
                console.log(`Cleared lastWeatherNotificationSentAt for report ${report._id} as weather is clear.`);
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('Error in daily summary or weather notifications:', error);
  }
}

/**
 * Get weekly statistics
 */
async function generateWeeklyStats() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const stats = await Report.aggregate([
    {
      $match: {
        createdAt: {
          $gte: weekAgo
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        },
        count: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return stats;
}

/**
 * Get monthly statistics
 */
async function generateMonthlyStats() {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const stats = await Report.aggregate([
    {
      $match: {
        createdAt: {
          $gte: monthAgo
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        },
        count: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return stats;
}

module.exports = {
  generateDailyStats,
  sendDailySummaryEmail,
  generateWeeklyStats,
  generateMonthlyStats
}; 