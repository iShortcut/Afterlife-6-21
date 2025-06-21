interface CancellationEmailTemplateProps {
  eventTitle: string;
  dateTime: string;
  location: string;
  memorialUrl: string | null;
  memorialTitle: string | null;
  creatorName: string;
  cancellationReason: string;
}

export function CancellationEmailTemplate({
  eventTitle,
  dateTime,
  location,
  memorialUrl,
  memorialTitle,
  creatorName,
  cancellationReason
}: CancellationEmailTemplateProps) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Cancelled: ${eventTitle}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #ef4444;
      color: white;
      padding: 24px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .email-body {
      padding: 24px;
    }
    .event-details {
      background-color: #f1f5f9;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
      text-decoration: line-through;
      color: #64748b;
    }
    .detail-row {
      display: flex;
      margin-bottom: 12px;
    }
    .detail-label {
      width: 100px;
      font-weight: 600;
      color: #64748b;
    }
    .detail-value {
      flex: 1;
      color: #64748b;
    }
    .cancellation-reason {
      background-color: #fee2e2;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
      color: #b91c1c;
    }
    .button {
      display: inline-block;
      background-color: #4f46e5;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin-right: 12px;
      margin-bottom: 12px;
    }
    .email-footer {
      background-color: #f1f5f9;
      padding: 16px 24px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    .email-footer a {
      color: #4f46e5;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100%;
        border-radius: 0;
      }
      .detail-row {
        flex-direction: column;
      }
      .detail-label {
        width: 100%;
        margin-bottom: 4px;
      }
      .button {
        display: block;
        text-align: center;
        margin-right: 0;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Event Cancelled</h1>
    </div>
    <div class="email-body">
      <p>Hello,</p>
      <p>We regret to inform you that the following event has been cancelled:</p>
      
      <div class="event-details">
        <div class="detail-row">
          <div class="detail-label">Event:</div>
          <div class="detail-value">${eventTitle}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">When:</div>
          <div class="detail-value">${dateTime}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Where:</div>
          <div class="detail-value">${location}</div>
        </div>
        ${memorialTitle ? `
        <div class="detail-row">
          <div class="detail-label">Memorial:</div>
          <div class="detail-value">${memorialTitle}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="cancellation-reason">
        <strong>Reason for cancellation:</strong>
        <p>${cancellationReason}</p>
      </div>
      
      ${memorialUrl ? `
      <p>
        <a href="${memorialUrl}" class="button">View Memorial</a>
      </p>
      ` : ''}
      
      <p>If you have any questions, please contact the event organizer directly.</p>
      
      <p>Best regards,<br>${creatorName}</p>
    </div>
    <div class="email-footer">
      <p>This notification was sent through <a href="https://afterlife.memorial">Afterlife</a></p>
    </div>
  </div>
</body>
</html>
  `;
}