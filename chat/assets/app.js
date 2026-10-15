// Chataropica shared client script

function toggleTheme() {
  var html = document.documentElement;
  var isDark = html.classList.toggle('dark');
  localStorage.setItem('chataropica_theme', isDark ? 'night' : 'day');
  var icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', function () {
  var isDark = document.documentElement.classList.contains('dark');
  var icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
});
