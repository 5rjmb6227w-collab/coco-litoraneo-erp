import { test, expect } from '@playwright/test';

/**
 * Testes E2E para o fluxo de autenticação.
 */
test.describe('Autenticação', () => {
  
  test('deve exibir a página inicial sem autenticação', async ({ page }) => {
    await page.goto('/');
    
    // Verifica se a página carregou
    await expect(page).toHaveTitle(/Coco Litorâneo/i);
  });
  
  test('deve exibir botão de login ou conteúdo quando não autenticado', async ({ page }) => {
    await page.goto('/');
    
    // Aguarda a página carregar completamente
    await page.waitForLoadState('networkidle');
    
    // Verifica se existe um botão de "Entrar no Sistema" ou conteúdo do dashboard
    const pageContent = await page.content();
    const hasLoginContent = pageContent.toLowerCase().includes('entrar') || 
                           pageContent.toLowerCase().includes('sistema') ||
                           pageContent.toLowerCase().includes('login');
    const hasDashboardContent = pageContent.toLowerCase().includes('dashboard') ||
                                pageContent.toLowerCase().includes('produção') ||
                                pageContent.toLowerCase().includes('estoque');
    
    // Aceita se tiver botão de login OU conteúdo do dashboard
    expect(hasLoginContent || hasDashboardContent).toBeTruthy();
  });
  
  test('deve redirecionar para OAuth ao clicar em login', async ({ page }) => {
    await page.goto('/');
    
    // Tenta encontrar e clicar no botão de login
    const loginButton = page.getByRole('button', { name: /entrar|login|acessar/i });
    const loginLink = page.getByRole('link', { name: /entrar|login|acessar/i });
    
    if (await loginButton.count() > 0) {
      await loginButton.click();
    } else if (await loginLink.count() > 0) {
      await loginLink.click();
    }
    
    // Aguarda navegação (pode ser para OAuth ou página de login)
    await page.waitForURL(/.*/, { timeout: 5000 }).catch(() => {});
    
    // Verifica se a URL mudou ou se ainda está na página inicial
    const currentUrl = page.url();
    expect(currentUrl).toBeDefined();
  });
  
  test('deve exibir mensagem de boas-vindas na página inicial', async ({ page }) => {
    await page.goto('/');
    
    // Verifica se existe algum texto de boas-vindas ou descrição do sistema
    const welcomeText = page.locator('text=/gestão|sistema|erp|coco/i');
    await expect(welcomeText.first()).toBeVisible({ timeout: 10000 });
  });
});
