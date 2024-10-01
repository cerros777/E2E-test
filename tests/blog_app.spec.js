const { test, expect, beforeEach, describe } = require('@playwright/test');
const { loginWith, createNewBlog } = require('./helper');

describe('Blog app', () => {
  beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('Login form is shown', async ({ page }) => {
    const locator = page.getByText('Log in to application');
    await expect(locator).toBeVisible();
  });

  describe('Login', () => {
    beforeEach(async ({ page, request }) => {
      await request.post('http://localhost:3001/api/testing/reset');
      await request.post('http://localhost:3001/api/users', {
        data: {
          username: 'usertest',
          name: 'test1',
          password: '1234'
        }
      });
      await page.goto('http://localhost:5173');
    });

    test('succeeds with correct credentials', async ({ page }) => {
      await loginWith(page, 'usertest', '1234');
      await expect(page.getByText('test1 logged in')).toBeVisible();
    });

    test('fails with wrong credentials', async ({ page }) => {
      await loginWith(page, 'testuser', 'wrong');
      await expect(page.getByText('Wrong credentials')).toBeVisible();
      await expect(page.getByText('test is logged in')).not.toBeVisible();
    });
  });

  describe('when logged in', () => {
    beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5173');
      await loginWith(page, 'usertest', '1234');
    });

    test('a new blog can be created', async ({ page }) => {
      await createNewBlog(page, 'first blog');
      await expect(page.getByText('first blog')).toBeVisible();
    });

    test('user likes blog', async ({ page }) => {
      await createNewBlog(page, 'liked blog');
      const blog = await page.getByText('liked blog').locator('..');
      await blog.getByRole('button', { name: 'view' }).click();
      await blog.getByRole('button', { name: 'like' }).click();
    });

    test('create and delete blog', async ({ page }) => {
      await createNewBlog(page, 'delete this blog');
      const blog = await page.getByText('delete this blog').locator('..');
      await blog.getByRole('button', { name: 'view' }).click();
      await page.waitForSelector('button[name="remove"]', { state: 'visible', timeout: 10000 });

      await expect(page.getByRole('button', { name: 'remove' })).toBeVisible();
      await page.getByRole('button', { name: 'remove' }).click();
      
      page.on('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });

      // Assert blog deletion
      await expect(page.getByText('delete this blog')).not.toBeVisible();
    });
  });
  describe('only creator can see delete button', () => {
    beforeEach(async ({ page, request }) => {
      await request.post('http://localhost:3001/api/testing/reset');
      // Create two users for testing
      await request.post('http://localhost:3001/api/users', {
        data: {
          username: 'testuser',
          name: 'test',
          password: '1234'
        }
      });
  
      await request.post('http://localhost:3001/api/users', {
        data: {
          username: 'otheruser',
          name: 'other',
          password: '4321'
        }
      });
  
      await page.goto('http://localhost:5173');
    });
  
    test('only the user who added the blog sees the delete button', async ({ page }) => {
      // Step 1: Login as testuser and create a blog
      await loginWith(page, 'testuser', '1234');
      await createNewBlog(page, 'blog by testuser');
      
      // Check that the delete button is visible for testuser
      const blog = await page.getByText('blog by testuser').locator('..');
      await blog.getByRole('button', { name: 'view' }).click();
      await expect(page.getByRole('button', { name: 'remove' })).toBeVisible();
  
      // Step 2: Logout as testuser
      await page.getByRole('button', { name: 'logout' }).click();
  
      // Step 3: Login as otheruser
      await loginWith(page, 'otheruser', '4321');
      
      // Check that the delete button is NOT visible for otheruser
      const otherBlog = await page.getByText('blog by testuser').locator('..');
      await otherBlog.getByRole('button', { name: 'view' }).click();
      await expect(page.getByRole('button', { name: 'remove' })).not.toBeVisible();
    });
  });

  describe('blogs are listed by likes in descending order', () => {
    beforeEach(async ({ page, request }) => {
      await request.post('http://localhost:3001/api/testing/reset');
      await request.post('http://localhost:3001/api/users', {
        data: {
          username: 'testuser',
          name: 'test',
          password: '1234'
        }
      });
      await page.goto('http://localhost:5173');
      await loginWith(page, 'testuser', '1234');
    });
  
    test('blogs are arranged by likes in descending order', async ({ page }) => {
      // Step 1: Create multiple blogs
      await createNewBlog(page, 'first blog');
      await createNewBlog(page, 'second blog');
      await createNewBlog(page, 'third blog');
  
      // Step 2: Like the blogs
      // Locate each blog and like them a certain number of times
  
      // Like "second blog" twice
      let secondBlog = await page.getByText('second blog').locator('..');
      await secondBlog.getByRole('button', { name: 'view' }).click();
      await secondBlog.getByRole('button', { name: 'like' }).click();
      await secondBlog.getByRole('button', { name: 'like' }).click();
  
      // Like "first blog" once
      let firstBlog = await page.getByText('first blog').locator('..');
      await firstBlog.getByRole('button', { name: 'view' }).click();
      await firstBlog.getByRole('button', { name: 'like' }).click();
  
      // No likes for "third blog"
      let thirdBlog = await page.getByText('third blog').locator('..');
      await thirdBlog.getByRole('button', { name: 'view' }).click(); // Expand to view likes
  
      // Step 3: Ensure that blogs are arranged by the number of likes in descending order
      const blogs = await page.locator('.blog'); // Assuming each blog entry has the class "blog"
      const blogTitles = await blogs.evaluateAll((blogItems) => {
        return blogItems.map((blog) => blog.textContent);
      });
  
      // Assert that the blogs are ordered correctly
      expect(blogTitles[0]).toContain('second blog'); // 2 likes
      expect(blogTitles[1]).toContain('first blog');  // 1 like
      expect(blogTitles[2]).toContain('third blog');  // 0 likes
    });
  });
});
