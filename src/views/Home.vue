<template>
    <div class="home">
      <h1>Welcome to Quant Frontend</h1>
      <p>Please <router-link to="/login">login</router-link> or <router-link to="/register">register</router-link> to view stocks.</p>
    </div>
  </template>
  
  <script>
  export default {
    name: 'Home'
  }
  </script>