/**
 * Analytics Controller
 * Handles incoming event batches from the frontend.
 */

exports.logBatch = async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'Invalid events batch' });
    }

    // Security: Limit batch size
    if (events.length > 50) {
      return res.status(413).json({ message: 'Batch too large' });
    }

    const processedIds = new Set();
    
    events.forEach(event => {
      // Deduplication check
      if (event.eventId && processedIds.has(event.eventId)) return;
      if (event.eventId) processedIds.add(event.eventId);

      console.log(`[EventLog] ${event.event} | ID: ${event.eventId || 'N/A'} | Path: ${event.properties?.path}`);
    });

    res.status(200).json({ 
      success: true, 
      processed: events.length,
      receivedAt: new Date().toISOString() 
    });
  } catch (error) {
    console.error('[AnalyticsServer] Error processing batch:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
