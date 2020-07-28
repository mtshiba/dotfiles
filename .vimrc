:set term=xterm-256color 
:syntax on
:colorscheme monokai
:set number
:set ruler
:set cursorline
:set laststatus=2
:set showmatch
:set list
set listchars=tab:▸\ ,eol:↲,extends:❯,precedes:❮
execute pathogen#infect()
call pathogen#helptags()

" nerdtree
map <C-n> :NERDTreeToggle<CR>
inoremap <silent> jj <ESC>
