const loginWith = async (page, username, password) => {
    await page.getByTestId('username').fill(username);
    await page.getByTestId('password').fill(password);
    await page.getByRole('button', { name: 'login' }).click();
  };
  
  const createNewBlog = async (page, name) => {
    await page.getByRole('button', { name: 'create new blog' }).click();
    await page.getByTestId('title').fill(name);
    await page.getByTestId('author').fill('DC');
    await page.getByTestId('url').fill('new.com');
    await page.getByRole('button', { name: 'create' }).click();
  };
  
  module.exports = { loginWith, createNewBlog };
  