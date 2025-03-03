export default class MicrosoftGraph {
  constructor(env, folderPath) {
    // ================= User-Defined Variables =================
    this.CLIENT_ID = env.MS_CLIENT_ID;       // Azure AD App Client ID
    this.TENANT_ID = env.MS_TENANT_ID;       // Azure AD Tenant ID
    this.CLIENT_SECRET = env.MS_CLIENT_SECRET; // Azure AD Client Secret
    this.SHAREPOINT_SITE_NAME = env.SHAREPOINT_SITE_NAME; // Site name
    this.SHAREPOINT_DRIVE_NAME = env.SHAREPOINT_DRIVE_NAME; // Drive name
    this.FOLDER_PATH = folderPath; // Folder path (passed as argument)
    // ==========================================================  

    this.GRAPH_API_BASE_URL = 'https://graph.microsoft.com/v1.0';
    this.AUTHORITY = `https://login.microsoftonline.com/${this.TENANT_ID}/oauth2/v2.0/token`;
    this.accessToken = this.getAccessToken();
}

  async getAccessToken() {
    const params = new URLSearchParams();
    params.append('client_id', this.CLIENT_ID);
    params.append('client_secret', this.CLIENT_SECRET);
    params.append('scope', 'https://graph.microsoft.com/.default'); // Application scope
    params.append('grant_type', 'client_credentials');

    const response = await fetch(this.AUTHORITY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!response.ok) {
        console.error('Failed to acquire token:', await response.text());
        process.exit(1);
    }

    const data = await response.json();
    // console.log('Token received:', data); // Debugging
    return data.access_token;
  }

  async fetchGraphAPI(endpoint) {
      const accessToken = await this.accessToken;
      const response = await fetch(`${this.GRAPH_API_BASE_URL}/${endpoint}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
          console.error(`Error fetching ${endpoint}:`, await response.text());
          process.exit(1);
      }

      return response.json();
  }

  async getSiteId() {
    if (this.siteId) {
        return this.siteId;
    }

    const accessToken = await this.accessToken;
    const siteUrl = `sites/lumbertraders.sharepoint.com:/sites/${this.SHAREPOINT_SITE_NAME}`;

    const response = await fetch(`${this.GRAPH_API_BASE_URL}/${siteUrl}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        console.error(`Error retrieving site ID (${siteUrl}):`, await response.text());
        process.exit(1);
    }

    const data = await response.json();
    this.siteId = data.id;
    return data.id;
  }


  async getDriveId() {
    if (this.driveId) {
        return this.driveId;
    }
  
    const accessToken = await this.accessToken;
    const siteId = await this.getSiteId();
    const drives = await this.fetchGraphAPI(`sites/${siteId}/drives`, accessToken);
    const drive = drives.value.find(d => d.name === this.SHAREPOINT_DRIVE_NAME);
    
    if (!drive) {
        console.error(`Drive '${this.SHAREPOINT_DRIVE_NAME}' not found.`);
        process.exit(1);
    }

    return drive.id;
  }

  async listFiles(subfolder) {
      const accessToken = await this.accessToken;
      const driveId = await this.getDriveId();
      const folderEncoded = encodeURIComponent(`${this.FOLDER_PATH}/${subfolder}`);
      const files = await this.fetchGraphAPI(`drives/${driveId}/root:/${folderEncoded}:/children`, accessToken);
      return files;

      files.value.forEach(file => {
          console.log(`- ${file.name} (${file.folder ? 'Folder' : 'File'})`);
      });
  }

  async downloadFile(file) {
    const accessToken = await this.accessToken;
    const driveId = await this.getDriveId();
    const folderEncoded = encodeURIComponent(this.FOLDER_PATH);

    const fileId = file.id;
    const downloadResponse = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/content`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!downloadResponse.ok) {
        console.error('Error downloading file:', await downloadResponse.text());
        return;
    };

    // Download is a readablestream, so we need to convert it to a buffer
    const fileBuffer = await downloadResponse.arrayBuffer();
    const fileName = file.name;
    console.log(`File downloaded: ${fileName}`);
    return fileBuffer;
  }

  async uploadFile(fileName, subfolder, fileBuffer) {
    const accessToken = await this.accessToken;
    const driveId = await this.getDriveId();
    const folderEncoded = encodeURIComponent(`${this.FOLDER_PATH}/${subfolder}`);

    const uploadResponse = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${folderEncoded}/${fileName}:/content`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream'
        },
        body: Buffer.from(fileBuffer)
    });

    if (!uploadResponse.ok) {
        console.error('Error uploading file:', await uploadResponse.text());
        return;
    }

    console.log(`File uploaded: ${fileName}`);
  }
}