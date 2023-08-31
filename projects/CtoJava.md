---
layout: project
type: project
image: img/CtoJavacrop.png
title: "C to Java"
date: 2022
published: true
labels:
  - C
  - Java
  - Java Native Interface
  - Classes
summary: "A code which converts Java to C, then back to Java."
---

This code implements native classes that can be found in Java as well as calling them from C. With this you are able to convert and write between two languages.
Introduction to Java Native Interface was implemented and with simple code from Java calls from a library in C which has the C code to be used.
Having knowledge of both languages as well as being able to use conversion between the two is a very powerful tool that can be used to produce a variety of things in both
C and Java

The code starts off in Java, where it is to find the multiples of 5 given user input, it then goes and calls the library function which the C code is stored, and retrieves and does the C code.
After, it exports it back to Java with the answers that it gave in C and produces a table to see if the number is a multiple or not.
Here is an example of the code.
```cpp
import java.util.Scanner;
import java.util.InputMismatchException;

public class homework10 
{
    public static native int is_multiple5(int maxval);

    /*****************************************************************
    //  Function name: static (Library Loading)
    //
    //  DESCRIPTION:   Has the C Source code stored in here to be used
    //                 in print_table
    //
    //  Parameters:    none
    //
    //  Return values:  none
    //
    ****************************************************************/  
    static
    {
        System.loadLibrary("multiple");
    }
    
    /*****************************************************************
    //  Function name: main
    //
    //  DESCRIPTION:   Runs the user_interface, stores the value from
    //                 user_interface in val, and runs print_table with
    //                 that value
    //
    //  Parameters:    String args[]: The arguments given through the
    //                 compiler
    //
    //  Return values:  none
    //
    ****************************************************************/  
 
    public static void main(String args[])
    {
        int val = 0;
        val = user_interface();

        print_table(val);
    }
    
    /*****************************************************************
    //  Function name: user_interface
    //
    //  DESCRIPTION:   The user_interface which interacts with the user
    //                 to input a maximum value (includes error handling)
    //                 which is then to be printed through print_table
    //
    //  Parameters:    none
    //
    //  Return values:  maxval: the maximum value given by the user
    //
    ****************************************************************/  

    static int user_interface()
    {
        int maxval = 0;
        boolean control = true;
        Scanner input = new Scanner(System.in);
        
        System.out.print("This program takes a user value and prints all the ");
        System.out.print("multiples of 5 to the maximum value.\n");
        System.out.print("Please enter a maximum value: ");
        
        do
        {
            try
            {
                maxval = input.nextInt();
                control = false;
            }
            catch (InputMismatchException e)
            {
                System.out.print("Error, not a numeric integer.\n");
                input = new Scanner(System.in);
                System.out.print("Please enter a numeric integer: ");
            }
        } while(control != false);
        
        while (maxval < 0)
        {
            try
            {
                System.out.print("Error, not a positive integer.\n");
                input = new Scanner(System.in);
                System.out.print("Please enter a positive integer: ");
                maxval = input.nextInt();
            }
            catch (InputMismatchException e)
            {
                input = new Scanner(System.in);
            }
        }
        
        input.close();
        return maxval;
    }
    
    /*****************************************************************
    //  Function name: print_table
    //
    //  DESCRIPTION:   Prints out all the values from the maximum user
    //                 input that shows whether or not the number is 
    //                 divisible by 5 or not
    //
    //  Parameters:    maxval: the maximum value that was given by the user
    //
    //  Return values:  none
    //
    ****************************************************************/  
 
    static void print_table(int maxval)
    {
        String str = String.format("%s %18s", "Number", "Is Multiple 5?\n");
        System.out.print(str);
        for (int i = 0; i <= maxval; i++)
        {
            int multiple = is_multiple5(i);
            String str2 = "";
            if (multiple == 1)
            {
                str2 = String.format("%6d %16s", i, "Yes");
            }
            else
            {
                str2 = String.format("%6d %16s", i, "No");
            }
           System.out.println(str2);
        }
       
    }
}

#include "homework10.h"
#include <stdio.h>

/*****************************************************************
//  Function name: Java_homework10_is_1multiple5
//
//  DESCRIPTION:   The Java called native function which takes in the
//                 maximum value from the user and goes through every
//                 number to the maximum value to see if the number is
//                 divisible by 5
//
//  Parameters:    JNIEnv *env: The environment pointer to the native class
//                 is_multiple5. Allows interaction with the JNI environment
//                 and works with this C Source code to rotate data back
//                 and forth.
//                 jclass class: the object on which is_multiple5 is invoked.
//                 A reference to the current class in homework10
//                 jint i: The max value that was input by the user invoked
//                 in java.
//
//  Return values:  0 : not divisible by 5
//                  1 : divisible by 5
//
****************************************************************/        
JNIEXPORT jint JNICALL Java_homework10_is_1multiple5
(JNIEnv *env, jclass class, jint i)
{
    if (i % 5 == 0)
    {
        i = 1;
    }
    
    else
    {
        i = 0;
    }
    
    return i;
}
```
