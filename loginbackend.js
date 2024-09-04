const loginText = document.querySelector(".title-text .login");
      const loginForm = document.querySelector("form.login");
      const loginBtn = document.querySelector("label.login");
      const signupBtn = document.querySelector("label.signup");
      const signupLink = document.querySelector("form .signup-link a");
      signupBtn.onclick = (()=>{
        loginForm.style.marginLeft = "-50%";
        loginText.style.marginLeft = "-50%";
      });
      loginBtn.onclick = (()=>{
        loginForm.style.marginLeft = "0%";
        loginText.style.marginLeft = "0%";
      });
      signupLink.onclick = (()=>{
        signupBtn.click();
        return false;
      });

// Initialize the Amazon Cognito service objects
const userPoolId = 'ap-south-1_WFbCSkTfr'; // Replace with your User Pool ID
const clientId = '4rheg3lpkj8iunhe0o6lkos9kp'; // Replace with your App Client ID
const region = 'your_region'; // Replace with your AWS region

const poolData = {
  UserPoolId: userPoolId,
  ClientId: clientId,
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

// Authenticate the user using AWS Cognito User Pool
function authenticateUser(email, password) {
  const authenticationData = {
    Username: email,
    Password: password,
  };

  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

  const userData = {
    Username: email,
    Pool: userPool,
  };

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
      // User authentication successful, redirect to welcome.html
      alert('Logged in with email: ' + email);
      localStorage.setItem("auth",1)
      localStorage.setItem("email",email)
      const encodedEmail = encodeURIComponent(email);
      window.location.href = `dashboard/pages/dashboard.html?email=${encodedEmail}`;

    },
    onFailure: function (err) {
      if (err.code === 'UserNotConfirmedException') {
        // User is not confirmed, redirect to verification.html
        const verificationUrl = `verification.html?email=${encodeURIComponent(email)}`;
      window.location.href = verificationUrl;
      } else {
        try {
          if (err.code === 'NewPasswordRequiredException') {
            // User needs to set a new password
            cognitoUser.completeNewPasswordChallenge(password, { email }, this);
          } else {
            // User authentication failed, display error message
            console.error(err);
            alert(err);
          }
        } catch (err) {
          // Catch any other unexpected errors
          console.error(err);
          alert(err);
        }
      }
    },
    newPasswordRequired: function (userAttributes, requiredAttributes) {
      // This callback is invoked when a new password is required
      // You can handle any additional logic or UI changes here
      // For simplicity, we'll use the same password as the current password
      cognitoUser.completeNewPasswordChallenge(password, null, this);
    },
  });
}


// Add user to the AWS Cognito user pool
function addUserToUserPool(email, password) {
  const attributeList = [
    new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email }),
  ];

  userPool.signUp(email, password, attributeList, null, function (err, result) {
    if (err) {
      // User sign-up failed, display error message
      console.error(err);
      alert(err);
    } else {
      // User sign-up successful, redirect to verification.html
      const verificationUrl = `verification.html?email=${encodeURIComponent(email)}`;
      window.location.href = verificationUrl;
    }
  });
}

// Event listener for the login button click
document.querySelector('.btn-layer.login').addEventListener('click', function (event) {
  event.preventDefault();

  const email = document.querySelector('.login input[type="text"]').value;
  const password = document.querySelector('.login input[type="password"]').value;

  // Authenticate the user
  authenticateUser(email, password);
});

document.addEventListener('DOMContentLoaded', function() {
  // Place your entire JavaScript code here
  // ...

  // Event listener for the login button click
  document.querySelector('.btn-layer.login').addEventListener('click', function (event) {
    event.preventDefault();

    const email = document.querySelector('.login input[type="text"]').value;
    const password = document.querySelector('.login input[type="password"]').value;

    // Authenticate the user
    authenticateUser(email, password);
  });

  // Event listener for the signup button click
  document.querySelector('.btn-layer.signup').addEventListener('click', function (event) {
    event.preventDefault();

    const email = document.querySelector('.signup input[type="text"]').value;
    const password = document.querySelector('.signup input[type="password"]').value;

    // Add user to the user pool
    addUserToUserPool(email, password);
  });
});
