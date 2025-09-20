---
layout: post
title: "C vs Fortran memory order."
description: "Understanding the difference between row-major and column-major memory ordering in C/C++ vs Fortran"
date: 2021-02-25
image: https://i.imgur.com/XAXOPdT.png
---
# C vs Fortran memory order.

There are two major types of memory ordering techniques used in programming languages to index arrays; row-major and column-major. As someone who mostly works with languages that use(or at least appear to) C like memory ordering or row-major memory ordering, it always takes a bit of mental exercise to adjust to Fortran-like or column-major memory ordering.

## Row-major memory order
In C/C++ arrays are indexed using row-major order, where consecutive elements of a row are stored next to each other. This means in a multidimensional array, let's say a 2D array, the first row is stored in a contiguous patch of memory, then the second row, and so on. 

![](https://i.imgur.com/XAXOPdT.png)

Another way to state the above would say that the most rapidly changing index is the last in ```array[i][j]```. Here the index *j* would be the fastest-changing index and *j* refers to each column(or the elements inside the row). The index *i* would refer to the entire row.

## Column-major memory order
In Fortran arrays are indexed using column-major order, where consecutive elements of a column instead of a row are stored next to each other. This means in a 2D array, the first column is stored in a contiguous patch of memory, then the second column, and so on. 

![](https://i.imgur.com/GGgqpfw.png)

Hence in the case of ```array[i][j]```, the index row index, *i.e.* *i* would change the quickest rather than *j*, that is of course because the column elements instead of row elements are stored in contiguous memory.

## Real-world example
The python module, NumPy, has a great function ```nditer```, which allows you to iterate over multidimensional arrays in the order in which its elements are stored in memory. NumPy also allows you to store arrays in both C-like or Fortran-like memory ordering, which makes it the perfect tool for this example. 

Let's start with an example 2D list.

{% highlight text %}
>>> example_list = [[1,  2,  3,  4], 
                    [5,  6,  7,  8], 
                    [9, 10, 11, 12]]
{% endhighlight %}

{% highlight text %}
>>> c_array = np.array(example_list, order='C')
>>> for curr_element in np.nditer(c_array):
...     print(curr_element, end=' ')

    1 2 3 4 5 6 7 8 9 10 11 12
{% endhighlight %}
Using ```order='C'``` you can specify C-like memory ordering. The output elements inside the rows are printed together as rows are stored together contiguously.

{% highlight text %}
>>> f_array = np.array(example_list, order='F')
>>> for curr_element in np.nditer(f_array):
...     print(curr_element, end=' ')

    1 5 9 2 6 10 3 7 11 4 8 12
{% endhighlight %}
Using ```order='F'``` you can specified Fortran-like memory ordering. The output is different than in the above case, as elements of a column were printed together because in this case columns are stored together contiguously.

## Imagining in 3D

The following diagrams depict how row-major and column-major memory orders would differ in higher dimensions.

![](https://i.imgur.com/LD9MIOF.png)

The above shows row-major memory order when using a 3D array. 

![](https://i.imgur.com/PuCzUQk.png)

The above shows column-major memory order when using a 3D array.