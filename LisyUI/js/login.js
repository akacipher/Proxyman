$(document).ready(function (){
  $('#lisy-login-form').submit(function (event){
    event.preventDefault()
    event.stopPropagation()
    
    // Ajaxem się logujemy
    $.ajax({
      type: "POST",
      url: "http://localhost:3000/login.ajax",
      data: JSON.stringify({
        email: $('#lisy-login-form > input[name="email"]').val(),
        password: $('#lisy-login-form > input[name="password"]').val()
      }),
      success: function (data) {
        if (data.status === 1) {
          document.cookie = "AuthID=" + data.token;
          location.reload();
        } else {
          alert('Zły email lub hasło!')
        }
      },
      contentType: 'text/plain',
      dataType: 'json'
    })
    
  })
})
