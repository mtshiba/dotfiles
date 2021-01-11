" set term=xterm-256color 
syntax on
colorscheme monokai
set number
set ruler
set cursorline
set laststatus=2
set showmatch
set list
set listchars=tab:▸\ ,eol:↲,extends:❯,precedes:❮
" execute pathogen#infect()
" call pathogen#helptags()

call plug#begin('C:\Users\sbym8\AppData\Local\nvim\plugged')
  " Plug 'cocopon/iceberg.vim'
  Plug 'rust-lang/rust.vim'
  Plug 'neoclide/coc.nvim', {'branch': 'release'}
  Plug 'preservim/nerdtree'
call plug#end()

filetype plugin indent on

" auto rustfmt
let g:rustfmt_autosave = 1

" Make <CR> auto-select the first completion item and notify coc.nvim to
" format on enter, <cr> could be remapped by other vim plugin
inoremap <silent><expr> <cr> pumvisible() ? coc#_select_confirm()
                              \: "\<C-g>u\<CR>\<c-r>=coc#on_enter()\<CR>"

" GoTo code navigation.
nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)

" nerdtree
nnoremap <leader>n :NERDTreeFocus<CR>
nnoremap <C-n> :NERDTree<CR>
nnoremap <C-t> :NERDTreeToggle<CR>
nnoremap <C-f> :NERDTreeFind<CR>

inoremap <silent> jj <ESC>
