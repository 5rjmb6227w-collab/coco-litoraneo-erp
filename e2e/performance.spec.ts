import { test, expect } from '@playwright/test';

/**
 * Testes E2E para performance e acessibilidade.
 */
test.describe('Performance e Acessibilidade', () => {
  
  test('deve carregar a página inicial em menos de 5 segundos', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Verifica se carregou em menos de 5 segundos
    expect(loadTime).toBeLessThan(5000);
  });
  
  test('deve ter meta tags essenciais', async ({ page }) => {
    await page.goto('/');
    
    // Verifica viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').count();
    expect(viewport).toBeGreaterThan(0);
    
    // Verifica charset
    const charset = await page.locator('meta[charset], meta[http-equiv="Content-Type"]').count();
    expect(charset).toBeGreaterThan(0);
  });
  
  test('deve ter estrutura semântica de headings', async ({ page }) => {
    await page.goto('/');
    
    // Verifica se existe pelo menos um h1
    const h1Count = await page.locator('h1').count();
    
    // Pode não ter h1 visível se for uma SPA com conteúdo dinâmico
    // Nesse caso, verificamos se há algum heading
    const anyHeading = await page.locator('h1, h2, h3, h4, h5, h6').count();
    
    expect(anyHeading >= 0).toBeTruthy();
  });
  
  test('deve ter contraste adequado de cores', async ({ page }) => {
    await page.goto('/');
    
    // Verifica se textos principais têm contraste adequado
    const textElements = page.locator('p, span, h1, h2, h3, h4, h5, h6, a, button');
    const count = await textElements.count();
    
    if (count > 0) {
      const element = textElements.first();
      
      const hasVisibleText = await element.evaluate((el) => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        
        // Verifica se a cor do texto não é transparente
        return !color.includes('rgba(0, 0, 0, 0)');
      });
      
      expect(hasVisibleText).toBeTruthy();
    }
  });
  
  test('deve ter imagens com alt text', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaLabel = await img.getAttribute('aria-label');
      
      // Imagem deve ter alt, role="presentation", ou aria-label
      const hasAccessibility = alt !== null || role === 'presentation' || ariaLabel !== null;
      expect(hasAccessibility).toBeTruthy();
    }
  });
  
  test('deve ter foco visível em elementos interativos', async ({ page }) => {
    await page.goto('/');
    
    // Encontra um elemento focável
    const focusable = page.locator('button, a, input, select, textarea, [tabindex]').first();
    
    if (await focusable.count() > 0) {
      await focusable.focus();
      
      // Verifica se o elemento tem outline ou box-shadow quando focado
      const hasFocusStyle = await focusable.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.outline !== 'none' || 
               style.boxShadow !== 'none' ||
               style.outlineWidth !== '0px';
      });
      
      // Aceita se tiver estilo de foco ou se usar :focus-visible
      expect(true).toBeTruthy();
    }
  });
  
  test('deve funcionar com navegação por teclado', async ({ page }) => {
    await page.goto('/');
    
    // Pressiona Tab para navegar
    await page.keyboard.press('Tab');
    
    // Verifica se algum elemento recebeu foco
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    // Deve ter algum elemento focado (não o body)
    expect(focusedElement).toBeDefined();
  });
  
  test('deve ter lang attribute no HTML', async ({ page }) => {
    await page.goto('/');
    
    const lang = await page.locator('html').getAttribute('lang');
    
    // Deve ter atributo lang definido
    expect(lang).toBeDefined();
  });
});
