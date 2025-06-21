interface EmailTemplateProps {
  eventTitle: string;
  dateTime: string;
  location: string;
  eventUrl: string;
  memorialUrl: string | null;
  memorialTitle: string | null;
  creatorName: string;
}

export function EmailTemplate({
  eventTitle,
  dateTime,
  location,
  eventUrl,
  memorialUrl,
  memorialTitle,
  creatorName
}: EmailTemplateProps) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Invitation: ${eventTitle}</title>
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
      background-color: #4f46e5;
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
      color: #334155;
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
    .button-secondary {
      background-color: #e2e8f0;
      color: #334155;
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
      <h1>You're Invited</h1>
    </div>
    <div class="email-body">
      <p>Hello,</p>
      <p>${creatorName} has invited you to attend an event:</p>
      
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
      
      <p>Please let us know if you can attend:</p>
      
      <p>
        <a href="${eventUrl}" class="button">View Event Details</a>
        ${memorialUrl ? `<a href="${memorialUrl}" class="button button-secondary">View Memorial</a>` : ''}
      </p>
      
      <p>We hope to see you there.</p>
      
      <p>Best regards,<br>${creatorName}</p>
    </div>
    <div class="email-footer">
      <p>This invitation was sent through <a href="https://afterlife.memorial">Afterlife</a></p>
      <p>If you have any questions, please contact the event organizer directly.</p>
    </div>
  </div>
</body>
</html>
  `;
}