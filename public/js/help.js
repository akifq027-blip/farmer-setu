/**
 * KisanSetu - Helpdesk & Farmer FAQs Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Accordion Logic
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      item.classList.toggle('active');
      const answer = item.querySelector('.faq-answer');
      if (item.classList.contains('active')) {
        answer.style.display = 'block';
        btn.querySelector('.faq-toggle-icon').textContent = '−';
      } else {
        answer.style.display = 'none';
        btn.querySelector('.faq-toggle-icon').textContent = '+';
      }
    });
  });

  // Helpdesk Query Form
  const form = document.getElementById('helpdesk-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('query-name').value;
      const mobile = document.getElementById('query-mobile').value;
      const message = document.getElementById('query-message').value;

      if (!name || !mobile || !message) {
        showToast('Please fill all grievance fields.', 'warning');
        return;
      }

      showToast('Your grievance ticket has been registered (Ticket #TK-' + Math.floor(1000 + Math.random() * 9000) + '). Center officer will call you.', 'success');
      form.reset();
    });
  }
});
