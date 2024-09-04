  const poolData = {
    UserPoolId: 'ap-south-1_WFbCSkTfr',
    ClientId: '4rheg3lpkj8iunhe0o6lkos9kp',
  };
  
  const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
  
  // Get the encoded email from the query parameter
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const encodedEmail = urlParams.get('email');
  
  // DOM elements
  const verificationForm = document.querySelector('.verification-form');
  const verificationInput = document.querySelector('.verification-input');
  const resendLink = document.querySelector('.resend-link');
  
  // Handle form submission
  verificationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const verificationCode = verificationInput.value;
    verifyUser(encodedEmail, verificationCode);
  });
  
  // Handle resend code click
  resendLink.addEventListener('click', () => {
    resendVerificationCode(encodedEmail);
  });
  
  // Verify the user using the verification code
  function verifyUser(email, verificationCode) {
    const userData = {
      Username: email,
      Pool: userPool,
    };
  
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  
    cognitoUser.confirmRegistration(verificationCode, true, function (err, result) {
      if (err) {
        if (err.code === 'CodeMismatchException') {
            // Wrong verification code, display error message
            alert('Incorrect verification code. Please try again.');
          } else {
            // Other error occurred, display generic error message
            console.error('Error verifying user:', err.message);
          }
      } else {
        // User verification successful, redirect to login.html
        window.location.href = 'login.html';
      }
    });
  }
  
  // Resend the verification code to the user's email
  function resendVerificationCode(email) {
    const userData = {
      Username: email,
      Pool: userPool,
    };
  
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  
    cognitoUser.resendConfirmationCode(function (err, result) {
      if (err) {
        // Resending verification code failed, display error message
        console.error(err);
      } else {
        // Verification code resent successfully
        alert('Verification code has been resent to your email.');
      }
    });
  }
  