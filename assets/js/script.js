async function triggerRerun() {
  const dateVal = document.getElementById("dateInput").value;
  const storeCode = document.getElementById("storeCodeInput").value;
  if (!dateVal || !storeCode) {
    alert("Please select a date first.");
    return;
  }
  // Send a GET request with the required parameters
  const response = await fetch(`/?performRerun=true&dateas=${dateVal}&storeCode=${storeCode}`);
  const text = await response.text();
  alert(text);
}

function populateFileList() {
  const dateInput = document.getElementById("dateInput");
  const storeCodeInput = document.getElementById("storeCodeInput");

  if (!dateInput.value || !storeCodeInput.value) {
    // Clear the file list if either input is empty
    const fileList = document.getElementById("fileList");
    fileList.innerHTML = ""; // Clear previous list
    return; // Do not proceed if either input is empty
  }

  // Fetch the list of files from the server
  fetch(`/?dateas=${dateInput.value}&storeCode=${storeCodeInput.value}`)
    .then(response => {
      if (!response.ok) {
        if (response.status === 404) {
          // Handle 404 case gracefully
          const fileList = document.getElementById("fileList");
          fileList.innerHTML = "<p>No files found for this selection.</p>";
          return Promise.reject("No files found");
        }
        return Promise.reject(`HTTP error: ${response.status}`);
      }
      return response.json();
    })
    .then(file => {
      const fileList = document.getElementById("fileList");
      fileList.innerHTML = ""; // Clear previous list
      const li = document.createElement("li");
      li.innerHTML = `<a href="/R2/${file.key}" download>${file.key.split('/')[file.key.split('/').length - 1]}</a>  - <small style="font-style: italic">Created: ${file.uploaded.split('T')[0]}</small>`;
      fileList.appendChild(li);
    })
    .catch(error => {
      console.log('Error fetching file list:', error);
      // Error is already handled above for 404 case
    });
}

document.addEventListener("DOMContentLoaded", function() {
  // Add event listeners to the dateInput and storeCodeInput elements
  // When these have selected values, perform a request to the server to get R2 files
  const dateInput = document.getElementById("dateInput");
  const storeCodeInput = document.getElementById("storeCodeInput");

  dateInput.addEventListener("change", populateFileList);
  storeCodeInput.addEventListener("change", populateFileList);
});